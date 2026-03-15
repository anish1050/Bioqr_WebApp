import express from "express";
import webauthnRoutes from "./routes/webauthn.routes.js";
console.log("Is webauthnRoutes a function?", typeof webauthnRoutes);
console.log("webauthnRoutes keys:", Object.keys(webauthnRoutes || {}));
