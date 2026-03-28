const fs = require("fs");
const files = ["index.html", "studio.html", "library.html", "admin-login.html", "admin-dashboard.html"];
for (const file of files) {
  const path = "C:/ai art/" + file;
  let t = fs.readFileSync(path, "utf8");
  t = t.replace(/\s*<script src="site-data\.js"><\/script>\r?\n?/g, "\n");
  fs.writeFileSync(path, t);
}
