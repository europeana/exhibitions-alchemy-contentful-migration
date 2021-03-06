require('dotenv').config();

const { Client } = require('pg');
const contentfulManagementPkg = require('contentful-management');
const contentful = require('contentful');

const pgClient = new Client({
  connectionString: process.env['PG_URL']
});

const contentfulManagement = {
  async connect() {
    const client = await contentfulManagementPkg.createClient({
      accessToken: process.env['CTF_CMA_ACCESS_TOKEN']
    });
    const space = await client.getSpace(process.env['CTF_SPACE_ID']);
    const environment = await space.getEnvironment(process.env['CTF_ENVIRONMENT_ID']);
    this.environment = environment;
    return environment;
  }
};

const contentfulPreviewClient = contentful.createClient({
  accessToken: process.env['CTF_CPA_ACCESS_TOKEN'],
  space: process.env['CTF_SPACE_ID'],
  environment: process.env['CTF_ENVIRONMENT_ID'],
  host: 'preview.contentful.com'
});

const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.keep(['cite']);

module.exports = {
  defaultLocale: {
    contentful: 'en-GB',
    alchemy: 'en'
  },
  maxLengthShort: 255,
  maxLengthLong: 50000,
  pgClient,
  contentfulManagement,
  contentfulPreviewClient,
  turndownService
};
