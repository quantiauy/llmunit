#!/usr/bin/env bun
import { execSync } from 'child_process';
import chalk from 'chalk';

const PORTS = [3000, 5173];

console.log(chalk.cyan('🔍 Checking ports...'));

let issuesFound = false;

for (const port of PORTS) {
  try {
    // Check if something is listening on the port
    const output = execSync(`lsof -i :${port} -t`).toString().trim();
    
    if (output) {
      issuesFound = true;
      const pids = output.split('\n');
      console.log(chalk.red(`\n⚠️  Port ${port} is already in use by PIDs: ${pids.join(', ')}`));
      
      for (const pid of pids) {
        try {
          const command = execSync(`ps -p ${pid} -o command=`).toString().trim();
          console.log(chalk.yellow(`   Process: ${command}`));
        } catch (e) {
          // Process might have exited
        }
      }
      
      console.log(chalk.magenta(`   👉 Recommendation: Run 'kill -9 ${pids.join(' ')}' to free the port.`));
    }
  } catch (e) {
    // Port is free (lsof returns non-zero exit code if no matches)
  }
}

if (!issuesFound) {
  console.log(chalk.green('✅ All required ports are available.'));
} else {
  console.log(chalk.yellow('\nℹ️  It is recommended to free the ports before starting the system.\n'));
  // We don't exit with error to let the user decide if they want to try anyway, 
  // or they can stop and follow recommendations.
}
