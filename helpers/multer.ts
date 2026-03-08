import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, "uploads/");
    },
    filename: (_req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);
        console.log("📁 Saving file as:", uniqueName);
        cb(null, uniqueName);
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        console.log("📁 File upload attempt:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        });
        cb(null, true);
    },
});
