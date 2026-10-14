# Outils de test (hors jeu)

Simulent la TV et les téléphones dans Chromium sans tête, avec un faux PeerJS. Rien ici n'est chargé par le jeu.

```bash
# 1) libs en local (les CDN ne sont pas joignables depuis le sandbox)
mkdir -p /tmp/kart-vendor && cd /tmp && npm pack three@0.128.0 qrcode-generator@1.4.4
tar xzf three-0.128.0.tgz && cp package/build/three.min.js /tmp/kart-vendor/
tar xzf qrcode-generator-1.4.4.tgz && cp package/qrcode.js /tmp/kart-vendor/
# 2) vérifier les circuits / simuler un championnat
node dev/check-track.js          # tous les circuits (ou : node dev/check-track.js 12)
node dev/sim-race.js 12 0 1      # championnat sur les circuits 12, 0 et 1
```
Variables : `PLAYWRIGHT_PATH`, `KART_VENDOR`.
