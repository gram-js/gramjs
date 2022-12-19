#!/bin/bash
mkdir LAYER_TMP && cd LAYER_TMP/
curl "https://raw.githubusercontent.com/telegramdesktop/tdesktop/dev/Telegram/Resources/tl/api.tl" -o tdesktop_api.tl 
curl "https://raw.githubusercontent.com/gram-js/gramjs/master/gramjs/tl/static/api.tl" -o gramjs_api.tl 
export TDESKTOP_LAYER=$(grep -E -o "^// LAYER [0-9]{1,3}(\w*)?$" tdesktop_api.tl | sed 's/[^0-9]//g')
export GRAMJS_LAYER=$(grep -E -o "^// LAYER [0-9]{1,3}(\w*)?$" gramjs_api.tl | sed 's/[^0-9]//g')
GRAMJS_LAYER=149
echo "Telegram is on layer $TDESKTOP_LAYER abd GramJS is on layer $GRAMJS_LAYER."
if cmp LAYER_TMP/tdesktop_api.tl LAYER_TMP/gramjs_api.tl || true; then
   echo "Will update to $TDESKTOP_LAYER now."
   cp LAYER_TMP/tdesktop_api.tl gramjs/tl/api.tl && cd gramjs/tl/
   sed -i "s/const LAYER = [0-9]\+/const LAYER = $TDESKTOP_LAYER/" AllTLObjects.ts
   npx ts-node generateModule.js && cd types-generator/ && npx ts-node generate.js && cd ../../../ && npx prettier --write . 
   echo "Done updating to $TDESKTOP_LAYER."
else "No changes in the schema."
fi
rm -rf LAYER_TMP/