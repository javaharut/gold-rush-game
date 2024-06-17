// routes/oauth-flow.js

import express from "express";
import { authorize, token, authenticate, test } from "services/oauth2.service";

const router = express.Router();

router.get("/authorize", authorize);
router.post("/token", token);
router.get("/authenticate", authenticate, test);

export default router;
