const { parse } = require("./parser");

console.dir(
  parse(
    `ipc:",.<>/?;\\|~Te!@l#$e%fôn^&i*-_=+cas" AND ipc.grp:(,.<>/?;\\|~Te!@l#$e%fôn^&i*-_=+cas)`
  ),
  {
    depth: null,
  }
);
