# PRAVINVERSE publishing instructions

Repository: https://github.com/PRAVINKUMAR-2917/pravinverse
Live URL after enabling Pages: https://pravinkumar-2917.github.io/pravinverse/

1. Extract this ZIP.
2. Open CMD inside the extracted `pravinverse` folder.
3. Run:
   git init
   git branch -M main
   git add .
   git commit -m "Launch PRAVINVERSE portfolio"
   git remote add origin https://github.com/PRAVINKUMAR-2917/pravinverse.git
   git push -u origin main
4. In GitHub repo Settings > Pages > Build and deployment > Source: GitHub Actions.
5. Open Actions tab to monitor deployment. The default branch must be `main`.

Important: Never upload node_modules. If there is already a remote/README commit, synchronize it first rather than force push. GitHub may prompt you to authenticate through the browser; do not paste personal access tokens into chats.

Preserves existing localStorage keys so previous game progress remains when running at same origin. A newly deployed domain begins with separate browser storage by browser security design.
