tsc
TYPE package.json > dist\package.json
TYPE README.md > dist\README.md
TYPE LICENSE > dist\LICENSE
mkdir dist\tl\static\
TYPE gramjs\tl\static\api.tl > dist\tl\static\api.tl
TYPE gramjs\tl\static\schema.tl > dist\tl\static\schema.tl
TYPE gramjs\tl\api.d.ts > dist\tl\api.d.ts
TYPE gramjs\define.d.ts > dist\define.d.ts
cd dist
npm publish
cd ..
