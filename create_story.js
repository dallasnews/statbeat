// prettier-ignore-start

const util = require("util");
const fs = require("fs");
fs.readFileAsync = util.promisify(fs.readFile);
const axios = require("axios");
const _ = require("underscore");



/**
 * Retrieve a story given a path made from the target date and
 * slugified-path headline. Note that this requires knowing the date
 * the story was created.
 */
async function retrieveStoryByPath(fusionbase, fusiontoken, storyPath) {
  const url = fusionbase + "/content/v4/";
  const r = await axios.get(url, {
    validateStatus: _ => true,
    params: {
      website: "dallas-news",
      website_url: storyPath
    },
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
    },
  });
  if( r.status == 404 )
    return null;
  if (r.status != 200) {
    console.log(r.data);
    throw new Error("BAD:status:" + r.status);
  }
  return r.data;
}


/**
 * Given document content, publish a story based on the document.
 * @return the id of the newly created document
 */
async function createStory(fusionbase, fusiontoken, documentContent) {
  const url = fusionbase + "/draft/v1/story/";
  const r = await axios.post(url, documentContent, {
    validateStatus: (_) => true,
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
    },
  });
  if (r.status != 200) {
    console.log(r.data);
    throw new Error("BAD:status:" + r.status);
  }
  return r.data.id;
}


/**
 * Given a story id and a date, create a circulate for the story using
 * a default url based on the date and the story headline.
 */
async function circulateStory(
  fusionbase,
  fusiontoken,
  documentId,
  date,
  headlineSlug
) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const day = String(date.getDate()).padStart(2, "0");
  const storyUrl = `/high-school-sports/${year}/${month}/${day}/${headlineSlug}/`;
  console.log("storyUrl:", storyUrl);
  const circulation = {
    document_id: documentId,
    website_id: "dallas-news",
    website_url: storyUrl,
    website_primary_section: {
      type: "reference",
      referent: {
        id: "/high-school-sports",
        type: "section",
        website: "dallas-news",
      },
    },
    website_sections: [
      {
        type: "reference",
        referent: {
          id: "/high-school-sports",
          type: "section",
          website: "dallas-news",
        },
      },
    ],
  };
  const url =
    fusionbase + "/draft/v1/story/" + documentId + "/circulation/dallas-news";
  const r = await axios.put(url, circulation, {
    validateStatus: (_) => true,
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
      "Content-Type": "application/json",
    },
  });
  if (r.status != 200) {
    console.log(r.data);
    throw new Error("BAD:status:", r, r.data);
  }
  return r.data;
}


/**
 * Given a document, get the id of the published revision.
 */
async function getPublishedRevisionId(fusionbase, fusiontoken, documentId) {
  const url = fusionbase + "/draft/v1/story/" + documentId;
  const r = await axios.get(url, {
    validateStatus: _ => true,
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
    },
  });
  if (r.status != 200) {
    console.error(r.status, r.data);
    throw new Error("BAD:status:", r);
  }
  if (!r.data.published_revision_id) throw new Error("BAD:pri", r);
  return r.data.published_revision_id;
}


/**
 * Retrieve the given revision of the given document from the draft api.
 */
async function getRevisionContent( fusionbase, fusiontoken, documentId, revisionId ) {
  const url =
    fusionbase + "/draft/v1/story/" + documentId + "/revision/" + revisionId;
  const r = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
    },
  });
  //console.error(r.status, r.data);
  if (r.status != 200) throw new Error("BAD:status:", r);
  if (!r.data) throw new Error("BAD:data:", r);
  return r.data;
}


/**
 * Update the draft revision of the given document with the given
 * content.
 */
async function updateDraftRevision( fusionbase, fusiontoken, documentId, documentContent) {
  console.log("updateDraftRevision()");
  const url = fusionbase + "/draft/v1/story/" + documentId + "/revision/draft";
  const r = await axios.put(url, documentContent, {
    validateStatus: _ => true,
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
    },
  });
  if (r.status != 200) {
    console.log(r.status);
    console.log(r.data);
    throw new Error("BAD:status:", r);
  }
  if (!r.data) throw new Error("BAD:data:", r);
  return r.data;
}


/**
 * Publish whatever is in the draft revision. Which we presumably just
 * updated with some new content.
 */
async function publishDraftRevision(fusionbase, fusiontoken, documentId) {
  const url =
    fusionbase + "/draft/v1/story/" + documentId + "/revision/published";
  const r = await axios.post(url, undefined, {
    headers: {
      Authorization: `Bearer ${fusiontoken}`,
    },
  });
  //console.error(r.status, r.data);
  if (r.status != 200) throw new Error("BAD:status:", r);
  if (!r.data) throw new Error("BAD:data:", r);
  return r.data;
}


function slugify(headline) {
  return headline
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[\s\W-]+/g, "-") // Replace spaces and non-word characters with dashes
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
}


function storyContentToANS(storyContent) {
  const ans = {
    type: "story",
    version: "0.10.10",
    canonical_website: "dallas-news",
    headlines: {
      basic: storyContent.headlines.basic,
    },
    subheadlines: {
      basic: storyContent.subheadlines.basic,
    },
    content_elements: storyContent.content_elements,
  };
  if (storyContent.featuredImageId) {
    ans.promo_items = {
      basic: {
        type: "reference",
        referent: {
          id: storyContent.featuredImageId,
          type: "image",
        },
      },
    };
  }
  return ans;
}


async function initializeStory(FUSION_BASE, FUSION_TOKEN, storyContent, ansDocument ) {
  const documentId = await createStory(FUSION_BASE, FUSION_TOKEN, ansDocument);
  await circulateStory( FUSION_BASE, FUSION_TOKEN, documentId, new Date(), slugify(storyContent.headlines.basic) );
  const results = await publishDraftRevision( FUSION_BASE, FUSION_TOKEN, documentId );
}


async function updateStory(fusionbase, fusiontoken, documentId, storyContent, ansContent ) {
  console.log("updateStory()");
  const publishedRevisionId = await getPublishedRevisionId(fusionbase, fusiontoken, documentId);
  const existingContent = await getRevisionContent(fusionbase, fusiontoken, documentId, publishedRevisionId);
  let updatedContent = JSON.parse(JSON.stringify(existingContent));
  updatedContent.ans.headlines.basic = ansContent.headlines.basic;
  updatedContent.ans.subheadlines.basic = ansContent.subheadlines.basic;
  updatedContent.ans.content_elements = ansContent.content_elements;
  updatedContent.ans.promo_items = {
    basic: {
      type: "reference",
      referent: {
        id: storyContent.featuredImageId,
        type: "image",
      },
    },
  };
  await updateDraftRevision(fusionbase, fusiontoken, documentId, updatedContent );
  return await publishDraftRevision(fusionbase, fusiontoken, documentId );
}


async function publishStory(FUSION_BASE, FUSION_TOKEN, storyContent) {
  console.log("publishStory()");
  const ansDocument = storyContentToANS(storyContent);
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const day = String(date.getDate()).padStart(2, "0");
  const headlineSlug = slugify(storyContent.headlines.basic);
  const storyUrl = `/high-school-sports/${year}/${month}/${day}/${headlineSlug}/`;
  const existingStory = await retrieveStoryByPath(FUSION_BASE, FUSION_TOKEN, storyUrl);
  if( existingStory ) {
    const documentId = existingStory._id;
    return updateStory(FUSION_BASE, FUSION_TOKEN, documentId, storyContent, ansDocument );
  } else {
    return initializeStory(FUSION_BASE, FUSION_TOKEN, storyContent, ansDocument );
  }
}


exports.publishStory = publishStory;


// prettier-ignore-end



// =================================================
// DO NOT USE ANYTHING BELOW HERE EXCEPT FOR TESTING
// =================================================

const FUSION_BASE = process.argv[2];
const FUSION_TOKEN = process.argv[3];

async function main() {
  const storyContent = {
    headlines: {
      basic: "This is a story: 5"
    },
    subheadlines: {
      basic: "or is it? is it is about nothing much?"
    },
    //featuredImageId: "SSNTBFYDQKYW32MB6WQKIORVVU",
    featuredImageId: "FQ2MM447HSSYLPEUEBKCS7Q2SA",
    content_elements: [{
      type: "text",
      content: "This is the boring first paragraph? Blah blah blah",
    },{
      type: "text",
      content: "This is the even more boring second paragraph",
    },{
      type: "text",
      content: "and another one."
    }],
  };
  await publishStory(FUSION_BASE, FUSION_TOKEN, storyContent);
  //const r = await retrieveStoryByPath(FUSION_BASE, FUSION_TOKEN, "/high-school-sports/2025/06/04/lamar-fake-vs-allen-fake/");
  //console.log(r._id);
}

main().then((_) => console.error("done"));
