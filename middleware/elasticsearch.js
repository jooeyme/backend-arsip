const esClient = require('../config/esClient')

const createIndex = async () => {
    const indices = ["surat_masuk", "surat_keluar"];
  
    for (const index of indices) {
      const exists = await esClient.indices.exists({ index });
      if (!exists) {
        await esClient.indices.create({
          index,
          body: {
            mappings: {
              properties: {
                no_agenda: { type: "text" },
                name_doc: { type: "text" },
                type_doc: { type: "keyword" },
                path_doc: { type: "text" },
                content: { type: "text" }, // Untuk menyimpan isi dokumen yang diekstrak
                createdAt: { type: "date" },
              },
            },
          },
        });
        console.log(`Index ${index} created successfully`);
      }
    }
  };
  
  module.exports = createIndex;
  