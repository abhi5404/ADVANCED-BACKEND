import { Router } from "express";

const userRoutes = Router();

userRoutes.get("/", (_request, response) => {
  response.json({ message: "Users route is working" });
});

export default userRoutes;