tsc
cp package.json dist/
cp README.md dist/
cp LICENSE dist/

mkdir -p dist/tl/static
cp gramjs/tl/static/api.tl dist/tl/static/
cp gramjs/tl/static/schema.tl dist/tl/static/
cp gramjs/tl/api.d.ts dist/tl/
cp gramjs/define.d.ts dist/