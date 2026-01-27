import chalk from 'chalk';

export class SeederLogger {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  /**
   * Print a formatted section header
   * @param {string} title - Section title
   */
  header(title) {
    console.log('\n' + chalk.bgBlue.bold.white(` ${title} `));
    console.log(); // Add spacing below header
  }

  /**
   * Print a success message
   * @param {string} message - Success message
   */
  success(message) {
    console.log(chalk.green('  ✓ ') + message);
  }

  /**
   * Print an info message
   * @param {string} message - Info message
   */
  info(message) {
    console.log(chalk.blue('  ℹ ') + message);
  }

  /**
   * Print a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    console.log(chalk.yellow('  ⚠ ') + message);
  }

  /**
   * Print an error message
   * @param {string} message - Error message
   * @param {Error} error - Optional error object
   */
  error(message, error) {
    console.error(chalk.red('  ✗ ') + message);
    if (error) {
      console.error(chalk.red('    Error: ') + error.message);
    }
  }

  /**
   * Print a list item
   * @param {string} message - Item content
    * @param {string} symbol - Custom symbol (default: +)
   */
  item(message, symbol = '+') {
    console.log(chalk.gray(`  ${symbol} `) + message);
  }

  /**
   * Print detailed info (indented)
   * @param {string} message - Detail message
   */
  detail(message) {
    console.log(chalk.dim(`    ${message}`));
  }

  /**
   * Print a divider line
   */
  divider() {
    console.log(chalk.dim('='.repeat(50)));
  }

  /**
   * Print a sub-header
   * @param {string} title - Sub-header title
   */
  subHeader(title) {
    console.log(chalk.bold('\n' + title));
  }

  /**
   * Print a result/summary line
   * @param {string} message - Result message
   */
  result(message) {
    console.log(chalk.bold('\n' + message + '\n'));
  }

  /**
   * Print a standardized summary block
   * @param {Object} stats - Stats object { addedCount, updatedCount, skippedCount, total }
   */
  summary(stats) {
    const { addedCount, updatedCount, skippedCount, total } = stats;
    let summaryText = chalk.bold(`> ${this.moduleName}: `); // Changed prefix
    
    const parts = [];
    if (addedCount > 0) parts.push(chalk.green(`${addedCount} added`));
    if (updatedCount > 0) parts.push(chalk.yellow(`${updatedCount} updated`));
    if (skippedCount > 0) parts.push(chalk.gray(`${skippedCount} skipped`));
    
    summaryText += parts.join(', ');
    if (total !== undefined) {
      summaryText += chalk.gray(` (Total: ${total})`);
    }

    console.log(); // Spacing
    console.log('  ' + summaryText);
  }
}
