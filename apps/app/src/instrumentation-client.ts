import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    {
      path: "/api/login-check",
      method: "POST",
    },
  ],
});
