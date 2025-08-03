module.exports = {
  '{apps,libs,tools,packages}/*.{ts,js,json,md,html,css,scss,less}': [
    'nx workspace-lint',
    'nx affected --target lint --uncommitted --fix true',
    'nx format:write --uncommitted --libs-and-apps',
  ],
};
