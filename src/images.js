require('dotenv').config();

const { pgClient, contentfulManagementClient } = require('./config');
const { assetExists, assetIdForImage } = require('./assets');
const { wrapLocale } = require('./utils');

const imageServer = process.env['ALCHEMY_IMAGE_SERVER'];
const maxLengthShort = 255;

let contentfulEnvironment;

const migrateImage = async(picture) => {
  const uid = picture.image_file_uid;
  const assetId = await assetIdForImage(uid);

  const exists = await assetExists(assetId);
  if (exists) {
    console.log(`[EXISTS] ${uid}: ${assetId}`);
    return;
  }

  try {
    // Assets may not be published without a title. Fallback to file name.
    const title = (!picture.title || picture.title === '') ? picture.image_file_name : picture.title;
    const asset = await contentfulEnvironment.createAssetWithId(assetId, {
      fields: {
        title: wrapLocale(title, { max: maxLengthShort }),
        file: wrapLocale({
          contentType: picture.image_file_format ? `image/${picture.image_file_format}` : null,
          fileName: picture.image_file_name,
          upload: `${imageServer}${encodeURIComponent(uid)}`
        })
      }
    });

    const processedAsset = await asset.processForAllLocales();
    processedAsset.publish();

    console.log(`[NEW] ${uid}: ${asset.sys.id}`);
  } catch (e) {
    console.log(`[ERROR] ${uid}: ${e}`);
  }
};

const migrateImages = async() => {
  contentfulEnvironment = await contentfulManagementClient.connect();

  await pgClient.connect();
  const res = await pgClient.query(`
    SELECT DISTINCT ON (ap.id, ap.image_file_uid, ap.image_file_format, ap.image_file_name) aec.title, ap.image_file_uid, ap.image_file_format, ap.image_file_name
    FROM alchemy_essence_pictures aep
    INNER JOIN alchemy_pictures ap ON aep.picture_id=ap.id
    INNER JOIN alchemy_contents ac ON ac.essence_id=aep.id AND ac.essence_type='Alchemy::EssencePicture'
    INNER JOIN alchemy_elements ae ON ac.element_id=ae.id
    LEFT JOIN alchemy_contents acc ON acc.element_id=ae.id AND acc.essence_type='Alchemy::EssenceCredit'
    LEFT JOIN alchemy_essence_credits aec ON acc.essence_id=aec.id
  `);
  await pgClient.end();

  for (const picture of res.rows) {
    await migrateImage(picture);
  }
};

const cli = async() => {
  migrateImages();
};

module.exports = {
  migrateImages,
  cli
};
