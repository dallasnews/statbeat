const util = require("util");
const fs = require("fs");
fs.readFileAsync = util.promisify(fs.readFile);
const axios = require("axios");
const _ = require("underscore");


/**
 * Given document content, publish a story based on the document.
 * @return the id of the newly created document
 */
async function createStory(fusionbase, fusiontoken, documentContent) {
    const url = fusionbase + '/draft/v1/story/';
    const r = await axios.post(url, documentContent, {
        validateStatus: _ => true,
        headers: {
            "Authorization" : `Bearer ${fusiontoken}`,
        }
    });
    if( r.status != 200 ) {
        console.log(r.data);
        throw new Error("BAD:status:" + r.status);
    }
    return r.data.id;
}

/**
 * Given a story id and a date, create a circulate for the story using
 * a default url based on the date and the story headline.
 */
async function circulateStory(fusionbase, fusiontoken, documentId, date, headlineSlug) {
    console.log("circulateStory()");
    console.log("circulateStory():", documentId);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const storyUrl = `/high-school-sports/${year}/${month}/${day}/${headlineSlug}/`;
    console.log("storyUrl:", storyUrl);
    const circulation = {
        "document_id": documentId,
        "website_id": "dallas-news",
        "website_url": storyUrl,
        "website_primary_section": {
            "type": "reference",
            "referent": {
                "id": "/high-school-sports",
                "type": "section",
                "website": "dallas-news"
            }
        },
        "website_sections": [{
            "type": "reference",
            "referent": {
                "id": "/high-school-sports",
                "type": "section",
                "website": "dallas-news"
            }
        }]
    };
    const url = fusionbase + '/draft/v1/story/' + documentId + '/circulation/dallas-news';
    const r = await axios.put(url, circulation, {
        validateStatus: _ => true,
        headers: {
            "Authorization" : `Bearer ${fusiontoken}`,
            "Content-Type" : "application/json"
        }
    });
    if( r.status != 200 ) {
        console.log(r.data);
        throw new Error("BAD:status:", r, r.data);
    }        
    return r.data;
}

/**
 * Given a document, get the id of the published revision.
 */
async function getPublishedRevisionId(fusionbase, fusiontoken, documentId) {
    const url = fusionbase + '/draft/v1/story/' + documentId;
    const r = await axios.get(url, {
        headers: {
            "Authorization" : `Bearer ${fusiontoken}`,
        }
    });
    //console.error(r.status, r.data);
    if( r.status != 200 )
        throw new Error("BAD:status:", r);
    if( !r.data.published_revision_id )
        throw new Error("BAD:pri", r);
    return r.data.published_revision_id;
}


/**
 * Retrieve the given revision of the given document from the draft api.
 */
async function getRevisionContent(fusionbase, fusiontoken, documentId, revisionId) {
    const url = fusionbase + '/draft/v1/story/' + documentId + '/revision/' + revisionId;
    const r = await axios.get(url, {
        headers: {
            "Authorization" : `Bearer ${fusiontoken}`,
        }
    });
    //console.error(r.status, r.data);
    if( r.status != 200 )
        throw new Error("BAD:status:", r);
    if( !r.data )
        throw new Error("BAD:data:", r);
    return r.data;
}


/**
 * Update the draft revision of the given document with the given
 * content.
 */
async function updateDraftRevision(fusionbase, fusiontoken, documentId, documentContent) {
    const url = fusionbase + '/draft/v1/story/' + documentId + '/revision/draft';
    const r = await axios.put(url, documentContent, {
        headers: {
            "Authorization" : `Bearer ${fusiontoken}`,
        }
    });
    //console.error(r.status, r.data);
    if( r.status != 200 )
        throw new Error("BAD:status:", r);
    if( !r.data )
        throw new Error("BAD:data:", r);
    return r.data;
}


/**
 * Publish whatever is in the draft revision. Which we presumably just
 * updated with some new content.
 */
async function publishDraftRevision(fusionbase, fusiontoken, documentId) {
    const url = fusionbase + '/draft/v1/story/' + documentId + '/revision/published';
    const r = await axios.post(url, undefined, {
        headers: {
            "Authorization" : `Bearer ${fusiontoken}`,
        }
    });
    //console.error(r.status, r.data);
    if( r.status != 200 )
        throw new Error("BAD:status:", r);
    if( !r.data )
        throw new Error("BAD:data:", r);
    return r.data;
}


/**
 * Replace the given target author with the given replacement
 * author. Work with the published version of the given document, not
 * the latest draft version! This is to avoid accidently publishing a
 * surprising draft. It is assumed that all the document fed through
 * this function are already published.
 */
async function handleDocument(fusionbase, fusiontoken, documentId, targetAuthor, replacementAuthorId) {
    const publishedRevisionId = await getPublishedRevisionId(fusionbase, fusiontoken, documentId);
    const existingContent = await getRevisionContent(fusionbase, fusiontoken, documentId, publishedRevisionId);
    const revisedContent = reviseContent( existingContent, targetAuthor, replacementAuthorId );
    await updateDraftRevision(fusionbase, fusiontoken, documentId, revisedContent );
    await publishDraftRevision(fusionbase, fusiontoken, documentId );
    //console.log(JSON.stringify(revisedContent, null, 2));
    return revisedContent.id;
}

function slugify(headline) {
  return headline
    .toLowerCase()                           // Convert to lowercase
    .trim()                                  // Remove leading/trailing whitespace
    .replace(/[\s\W-]+/g, '-')               // Replace spaces and non-word characters with dashes
    .replace(/^-+|-+$/g, '');                // Remove leading/trailing dashes
}

function storyContentToANS(storyContent) {
    const ans = {
        type: "story",
        version: "0.10.10",
        canonical_website: "dallas-news",
        headlines: {
            basic: storyContent.headlines.basic
        },
        subheadlines: {
            basic: storyContent.subheadline.basic
        },
        content_elements: storyContent.content_elements
    };
    if( storyContent.featuredImageId ) {
        ans.promo_items = {
            basic: {
                type: "reference",
                referent: {
                    id: storyContent.featuredImageId,
                    type: "image"
                }
            }
        }
    }
    return ans;
}


async function publishStory(FUSION_BASE, FUSION_TOKEN, storyContent) {
    const ansDocument = storyContentToANS(storyContent);
    const documentId = await createStory(FUSION_BASE, FUSION_TOKEN, ansDocument);
    await circulateStory(FUSION_BASE, FUSION_TOKEN, documentId, new Date(), slugify(storyContent.headline));
    const results = await publishDraftRevision(FUSION_BASE, FUSION_TOKEN, documentId);
    console.log(JSON.stringify(results));
    return results;
}



/*
 * Main entry point.
 *
 * Arguments are:
 *
 * 0: file-path of the structed input (see notes)
 * 1: replacement author id
 * 2: base url of fusion (mainly so we can test with staging)
 * 3: a read/write fusion token
 *
 * Input format is: {
 *   _id: <document_id>,
 *   target_authors: [{
 *     _id: <author-id-in-fusion>,
 *     email: <author-email>
 *   }]
 * }
 *
 * Note that we only process a single target-author, but we can always
 * run the process multiple times.
 */

const FUSION_BASE = process.argv[2];
const FUSION_TOKEN = process.argv[3];

async function main() {
    const storyContent = {
        headline: "This is a story: 4",
        subheadline: "it is about nothing much",
        featuredImageId: "SSNTBFYDQKYW32MB6WQKIORVVU",
        content_elements:[{
            type: "text",
            content: "This is the boring first paragraph"
        },{
            type: "text",
            content: "This is the even more boring second paragraph"
        }]
    };

    publishStory(FUSION_BASE, FUSION_TOKEN, storyContent);
}

//main().then((_) => console.error("done"));



exports.publishStory = publishStory;

