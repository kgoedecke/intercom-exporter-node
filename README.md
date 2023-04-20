# intercom-exporter-node

This script allows you to export all conversations from Intercom using Node.

Conversations get saved to a JSONL ([JSON Lines](https://jsonlines.org/)) file in order to fine tune a ChatGPT model. All conversations are stripped down to the initial questions and the very first reply.

The JSON Lines file has the following structure:

```json
{ "prompt": "<prompt text>", "completion": "<ideal generated text>" }
```

## Setup

Get your Intercom API access token as described here: https://developers.intercom.com/building-apps/docs/authentication-types#access-tokens

Create a `.env` file based on the values in `.env.example`.

Then run `yarn start`.

A file called `output.jsonl` will be created in the output directory that you've specified in your `.env` file.

## Copyright

(c) 2023 Kevin Goedecke
