const esClient = require("../config/esClient");

// 2️⃣ Definisi mapping untuk tiap index
const indices = {
  surat_masuk: {
    settings: {
      analysis: {
        tokenizer: {
          edge_ngram_tok: {
            type: "edge_ngram",
            min_gram: 2,
            max_gram: 20,
            token_chars: ["letter", "digit"],
          },
        },
        analyzer: {
          autocomplete_index: {
            tokenizer: "edge_ngram_tok",
            filter: ["lowercase"],
          },
          autocomplete_search: {
            tokenizer: "standard",
            filter: ["lowercase"],
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: "keyword" },
        no_agenda_masuk: { type: "keyword" },
        tgl_terima: { type: "date" },
        no_surat: { type: "keyword" },
        tgl_surat: { type: "date" },
        perihal: {
          type: "text",
          analyzer: "autocomplete_index",
          search_analyzer: "autocomplete_search",
        },
        asal_surat: {
          type: "text",
          analyzer: "standard",
        },
        keterangan: {
          type: "text",
          analyzer: "standard",
        },
        status: { type: "keyword" },
        sifat: { type: "keyword" },
        lampiran: {
          type: "nested",
          properties: {
            filename: { type: "keyword" },
            url: { type: "keyword" },
          },
        },
        jenis: { type: "keyword" },
        penerima: { type: "text", analyzer: "standard" },
        tembusan: { type: "text", analyzer: "standard" },
        no_folder: { type: "keyword" },
        createdAt: { type: "date" },
        content: { type: "text" }
      },
    },
  },

  surat_keluar: {
    settings: {
      analysis: {
        tokenizer: {
          edge_ngram_tok: {
            type: "edge_ngram",
            min_gram: 2,
            max_gram: 20,
            token_chars: ["letter", "digit"],
          },
        },
        analyzer: {
          autocomplete_index: {
            tokenizer: "edge_ngram_tok",
            filter: ["lowercase"],
          },
          autocomplete_search: {
            tokenizer: "standard",
            filter: ["lowercase"],
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: "keyword" },
        no_surat: { type: "keyword" },
        tgl_surat: { type: "date" },
        perihal: {
          type: "text",
          analyzer: "autocomplete_index",
          search_analyzer: "autocomplete_search",
        },
        ditujukan: { type: "text", analyzer: "standard" },
        keterangan: { type: "text", analyzer: "standard" },
        status: { type: "keyword" },
        sifat: { type: "keyword" },
        lampiran: {
          type: "nested",
          properties: {
            filename: { type: "keyword" },
            url: { type: "keyword" },
          },
        },
        jenis: { type: "keyword" },
        tembusan: { type: "text", analyzer: "standard" },
        no_folder: { type: "keyword" },
        createdAt: { type: "date" },
        content: { type: "text" }
      },
    },
  },
};

async function initIndices() {
  for (const [indexName, indexDefinition] of Object.entries(indices)) {
    // ① `existsResponse.body` adalah boolean
    const { body: indexExists } = await esClient.indices.exists({
      index: indexName,
    });

    if (!indexExists) {
      // ② Buat index baru hanya kalau belom ada
      try {
        await esClient.indices.create({
          index: indexName,
          body: {
            settings: indexDefinition.settings,
            mappings: indexDefinition.mappings,
          },
        });
        console.log(`✓ Index "${indexName}" berhasil dibuat.`);
      } catch (err) {
        // Meski jarang, guard ulang kalau ES bilang sudah ada
        if (
          err.meta?.body?.error?.type !== "resource_already_exists_exception"
        ) {
          throw err;
        }
        console.log(`ℹ️ Index "${indexName}" sudah ada, skip create.`);
      }
    } else {
      // ③ Patch settings & mappings kalau index sudah ada
      await esClient.indices.putSettings({
        index: indexName,
        body: indexDefinition.settings,
      });
      await esClient.indices.putMapping({
        index: indexName,
        body: indexDefinition.mappings,
      });
      console.log(`↻ Index "${indexName}" di‐update mapping & settings.`);
    }
  }
}

const resetIndices = async () => {
  for (const [name, def] of Object.entries(indices)) {
    // 1) Hapus index lama jika ada
    await esClient.indices.delete({ index: name, ignore_unavailable: true });
    console.log(`🗑️  Index "${name}" dihapus (jika ada).`);

    // 2) Buat index baru
    await esClient.indices.create({
      index: name,
      body: {
        settings: def.settings,
        mappings: def.mappings,
      },
    });
    console.log(`✅ Index "${name}" berhasil dibuat ulang.`);
  }
};

module.exports = resetIndices;
// resetIndices()
//   .then(() => {
//     console.log("🎉 Semua index telah direset.");
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.error("❌ Gagal reset indices:", err);
//     process.exit(1);
//   });

// initIndices()
//   .then(() => {
//     console.log('✅ Elasticsearch init selesai.');
//     process.exit(0);
//   })
//   .catch(err => {
//     console.error('❌ Gagal init Elasticsearch:', err);
//     process.exit(1);
//   });
