TYPE package.json > dist\package.json
TYPE README.md > dist\README.md
TYPE LICENSE > dist\LICENSE
mkdir dist\tl\static\
TYPE gramjs\tl\static\api.tl > dist\tl\static\api.tl
TYPE gramjs\tl\static\schema.tl > dist\tl\static\schema.tl
cd dist
npm publish
cd ..
