@echo off
echo.
echo  ╔═══════════════════════════════╗
echo  ║    NovaGYM — Lancement app    ║
echo  ╚═══════════════════════════════╝
echo.
echo  Ouverture dans Chrome...
echo  (laisse cette fenetre ouverte pendant que tu utilises l'app)
echo.
start http://localhost:8080
python -m http.server 8080
