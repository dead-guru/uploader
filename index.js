import crypto from "crypto";
import sharp from "sharp";
import bodyParser from "body-parser";
import fs from "fs";
import basicAuth from "express-basic-auth";
import express from "express";
import { fileTypeFromBuffer } from "file-type";
import * as dotenv from "dotenv";
import crc32 from "buffer-crc32";

dotenv.config();

const port = process.env.HTTP_PORT;
const adminPass = process.env.ADMIN_PASS;
const siteUrl = process.env.SITE_URL;
const encryptKey = process.env.SECRET;
const limit = process.env.FILE_LIMIT;

const app = express();

const getUnauthorizedResponse = (req) => {
    console.log(req.auth);
    return req.auth ? "Credentials rejected" : "No credentials provided";
};

const aes256ctr = (encryptKey) => {
    const ALGO = "aes-256-ctr";
    //aes-256-gcm instead ctr?

    const encrypt = (buffer, key) => {
        key = crypto
            .createHash("sha256")
            .update(key + encryptKey)
            .digest("base64")
            .substr(0, 32);
        const iv = crypto.randomBytes(16); //crypto.randomBytes is a poor way for IV generation.
        const cipher = crypto.createCipheriv(ALGO, key, iv);

        return {
            iv: iv,
            algo: ALGO,
            buffer: Buffer.concat([cipher.update(buffer), cipher.final()]),
        };
    };

    const decrypt = (iv, buffer, key) => {
        key = crypto
            .createHash("sha256")
            .update(key + encryptKey)
            .digest("base64")
            .substr(0, 32);

        const decipher = crypto.createDecipheriv(ALGO, key, iv);

        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    };

    return {
        encrypt,
        decrypt,
    };
};

const aesCipher = aes256ctr(encryptKey);

app.get("/files/:path*", (req, res) => {
    const newDir = "./public/" + req.params["path"];
    const newPath = newDir + req.params[0];
    fs.readFile(newPath, async (err, data) => {
        if (!err && data) {
            const verB = data.slice(0, 4);
            let file = data;
            if (verB.toString() === "1001") {
                //if file encrypted it always firs 4 bytes is version TODO: collision fix (add some string like UENCR?)
                const algo = file.slice(4, 15).toString(); //unused
                const dateB = file.slice(31, 44); //unused

                const iv = file.slice(15, 31);
                const crc = file.slice(44, 48);
                const buffer = file.slice(49);

                file = aesCipher.decrypt(
                    iv,
                    buffer,
                    req.params["path"] + "/" + req.params[0]
                );
                if (Buffer.compare(crc32(file), crc) !== 0) {
                    console.log(
                        "CRC BROKEN!",
                        crc32.unsigned(file),
                        crc.toString()
                    );

                    res.setHeader("Broken-CRC", crc.toString());
                }
            }

            try {
                const fileType = await fileTypeFromBuffer(file);
                res.setHeader("Content-Type", fileType.mime);
            } catch (e) {
                console.log("[ERROR] Unable get mime!" + newPath);
                res.setHeader(
                    'Content-Disposition", "attachment; filename=' +
                        req.params[0]
                );
            }

            res.status(200).end(file);
        } else {
            res.status(404).end("No file: " + newPath);
        }
    });

    return;
});

app.put(
    "/upload/:path*",
    [
        basicAuth({
            users: { admin: adminPass },
            unauthorizedResponse: getUnauthorizedResponse,
        }),
        bodyParser.raw({ type: "binary/octet-stream", limit: limit }),
        (error, req, res, next) => {
            console.log(
                "[ERROR] " +
                    "Route: " +
                    req.method +
                    " " +
                    req.path +
                    ", Message: " +
                    error.message
            );
            res.status(500).end(error.message);
        },
    ],
    async function (req, res) {
        const newDir = "./public/" + req.params["path"];
        const newPath = newDir + "/" + req.params[0];

        if (fs.existsSync(newPath)) {
            // 'replace' in req.query && enable replacing via config?
            res.status(400).end("file exists");

            return;
        }

        if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir);
        }
        let data = req.body;

        if (data.length <= 0) {
            res.status(400).end("no file");

            return;
        }

        if (req.params[0].endsWith(".jpg")) {
            //optimize jpeg TODO: add optimizations for another file formats (e.g. png)
            data = await sharp(data)
                .withMetadata()
                .jpeg({
                    quality: 30,
                    mozjpeg: true,
                })
                .toBuffer();
        }

        const encrypted = aesCipher.encrypt(
            data,
            req.params["path"] + "/" + req.params[0]
        );

        const ver = Buffer.from("1001"); // string -> buffer
        const crcBuff = crc32(data); // buffer
        const iv = encrypted.iv; //buffer
        const algo = Buffer.from(encrypted.algo); //string -> buffer
        const date = Buffer.from(Date.now() + ""); // number -> string -> buffer

        const separator = Buffer.from("|"); //separate metadata and file buffer

        const pack = Buffer.concat([
            // pack - stored to file
            ver,
            algo,
            iv,
            date,
            crcBuff,
            separator,
            encrypted.buffer,
        ]);

        fs.open(newPath, "w", function (err, fd) {
            fs.write(fd, pack, 0, pack.length, null, function (err) {
                if (err) {
                    console.log("error writing file: " + err);
                    res.status(400).end("save error");

                    return;
                }
                fs.close(fd, function () {
                    res.status(201).end(
                        siteUrl + "/files/" + req.params["path"] + req.params[0]
                    );
                });
            });
        });
    }
);

const server = app.listen(port, () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log("Uploader app listening at http://%s:%s", host, port);
});
