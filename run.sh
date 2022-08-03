ts-node src/index.ts || exit 1;
gcloud alpha storage cp -r ./out/* gs://fertilizer;
echo "Done generating Fertilizer metadata."