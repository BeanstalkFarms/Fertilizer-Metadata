#!/bin/sh
echo "Generating Fertilizer metadata."
yarn generate;
echo "Generated Typechain files."
rm -rf ./dist && mkdir ./dist;
echo "Cleaned and recreated ./dist directory."
yarn run ts-node src/index.ts || exit 1;
#gcloud alpha storage cp -r ./out/* gs://fertilizer;
echo "Done generating Fertilizer metadata."