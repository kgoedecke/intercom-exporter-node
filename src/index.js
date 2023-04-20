import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'node:fs';
import { sleep, removeHtmlTags } from './utils.js';

dotenv.config();

const CONVERSATIONS_API_URL = 'https://api.intercom.io/conversations';

const { INTERCOM_TOKEN, OUTPUT_PATH } = process.env;
const OUTPUT_FILE = 'output.jsonl';

const RATE_LIMIT_REMAINING = 20;
const RATE_LIMIT_SLEEP_TIME = 10;

const header = {
  Accept: 'application/json',
  Authorization: `Bearer ${INTERCOM_TOKEN}`,
};

const checkRateLimit = async (response) => {
  if (response.headers['X-RateLimit-Remaining'] < RATE_LIMIT_REMAINING) {
    console.log('sleeping for 10s');
    await sleep(RATE_LIMIT_SLEEP_TIME);
  }
};

const getFirstPage = async () => {
  const response = await fetch(
    `${CONVERSATIONS_API_URL}/?order=desc&sort=updated_at`,
    { headers: header, method: 'GET' }
  );
  const data = await response.json();
  await checkRateLimit(response);
  const { page } = data.pages;
  const {
    pages: { total_pages: totalPages },
  } = data;

  return { data, page, totalPages };
};

const getConversationDetails = async (id) => {
  const response = await fetch(`${CONVERSATIONS_API_URL}/${id}`, {
    headers: header,
    method: 'GET',
  });
  const data = await response.json();
  await checkRateLimit(response);

  return {
    conversation_parts: data?.conversation_parts?.conversation_parts,
    source: data.source,
  };
};

const getNextPageUrl = (data) => {
  const nextPageId = data?.pages?.next.starting_after;
  const nextPageUrl = `${CONVERSATIONS_API_URL}?starting_after=${nextPageId}`;
  console.log('Next page URL:', nextPageUrl);

  return nextPageUrl;
};

const getNextPages = async (url) => {
  const response = await fetch(url, { headers: header, method: 'GET' });
  const data = await response.json();
  const currentPage = data.pages.page;
  const totalPages = data.pages.total_pages;
  if (data) {
    console.log(`Retrieving ${currentPage} of ${totalPages}`);
  }
  await checkRateLimit(response);

  return { data, page: currentPage };
};

const writeJsonlFile = async (prompt, completion) => {
  const promptData = {
    prompt,
    completion,
  };
  await fs.promises.appendFile(
    `${OUTPUT_PATH}/${OUTPUT_FILE}`,
    `${JSON.stringify(promptData)}\n`
  );
};

const main = async () => {
  const { data: firstData, page: firstPage, totalPages } = await getFirstPage();
  let currentPage = firstPage;
  let currentData = firstData;
  while (currentPage < totalPages) {
    const nextPageUrl = getNextPageUrl(currentData);
    const { data: nextData, page: nextPage } = await getNextPages(nextPageUrl);
    const conversationDetails = await Promise.all(
      nextData.conversations.map((conversation) =>
        getConversationDetails(conversation.id)
      )
    );

    /*
     * Only display customer initiated conversations
     */
    const customerConversations = conversationDetails.filter(
      (conversationDetail) =>
        conversationDetail.source.delivered_as === 'customer_initiated'
    );

    /*
     * Only take into account the first initial reply
     */
    const conversationsAndFirstReply = customerConversations.map(
      (conversationDetail) => {
        return {
          question: conversationDetail.source.body,
          reply: conversationDetail.conversation_parts[0],
        };
      }
    );

    /*
     * Filter out empty replies and only keep the ones replied by an admin
     */
    const conversationsWithAdminReplies = conversationsAndFirstReply
      .filter((conversationPart) => conversationPart.reply.body)
      .filter(
        (conversationPart) => conversationPart.reply.author.type === 'admin'
      );

    const saveAll = conversationsWithAdminReplies.map((cleanedReply) =>
      writeJsonlFile(
        removeHtmlTags(cleanedReply.question),
        removeHtmlTags(cleanedReply.reply.body)
      )
    );
    await Promise.all(saveAll);

    currentPage = nextPage;
    currentData = nextData;
  }
};

main();
