#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');

const commands = [
  {
    name: 'preparse_routes',
    description: '[rails_dir]    Parse Rails routes and output json to stdout',
    async fn(railsDir = '.') {
      try {
        process.stdout.write(
          execSync(
            `bundle exec rails runner ${path.resolve(
              __dirname,
              'get_routes.rb'
            )}`,
            {
              cwd: path.resolve(process.cwd(), railsDir),
            }
          )
            .toString()
            .trim()
        );
      } catch (err) {
        console.error('Failed to preparse Rails routes!');
        throw err;
      }
    },
  },
];

const usage = () => {
  console.log(`
Usage: npx rails.macro <command> [...options]

Commands:
${commands.map((c) => c.name + ' ' + c.description).join('\n')}    
`);
  process.exit(1);
};

const [commandName, ...args] = process.argv.slice(
  process.argv.indexOf(__filename) + 1
);
const command = commands.find((c) => c.name === commandName);

if (!command || args.includes('-h') || args.includes('--help')) usage();

command.fn(...args).catch((err) => {
  console.error(err);
  process.exit(1);
});
