/**
 * Template Renderer Utility
 * Renders email templates using Handlebars
 */

import Handlebars from 'handlebars';
import { EmailTemplateData } from '../models/communication';
import logger from './logger';

class TemplateRenderer {
  constructor() {
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper for formatting currency
    Handlebars.registerHelper('currency', (value: number) => {
      if (typeof value !== 'number') {
        return value;
      }
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    });

    // Helper for formatting dates
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) {
        return '';
      }
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Helper for conditional rendering
    Handlebars.registerHelper('ifEquals', function (this: any, arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Helper for checking if array is not empty
    Handlebars.registerHelper('ifNotEmpty', function (this: any, array: any[], options: any) {
      return array && array.length > 0 ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Render template with data
   * @param template - Template string
   * @param data - Template data
   * @returns Rendered string
   */
  render(template: string, data: EmailTemplateData): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    } catch (error) {
      logger.error('Error rendering template', { error, data });
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  /**
   * Render subject line
   * @param subject - Subject template
   * @param data - Template data
   * @returns Rendered subject
   */
  renderSubject(subject: string, data: EmailTemplateData): string {
    return this.render(subject, data);
  }

  /**
   * Render HTML body
   * @param bodyHtml - HTML template
   * @param data - Template data
   * @returns Rendered HTML
   */
  renderHtml(bodyHtml: string, data: EmailTemplateData): string {
    return this.render(bodyHtml, data);
  }

  /**
   * Render plain text body
   * @param bodyText - Text template
   * @param data - Template data
   * @returns Rendered text
   */
  renderText(bodyText: string, data: EmailTemplateData): string {
    return this.render(bodyText, data);
  }

  /**
   * Validate template syntax
   * @param template - Template string
   * @returns True if valid, false otherwise
   */
  validateTemplate(template: string): boolean {
    try {
      Handlebars.compile(template);
      return true;
    } catch (error) {
      logger.error('Invalid template syntax', { error, template });
      return false;
    }
  }

  /**
   * Extract variables from template
   * @param template - Template string
   * @returns Array of variable names
   */
  extractVariables(template: string): string[] {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      // Extract variable name and clean it
      const variable = match[1].trim();
      // Remove helpers and special characters
      const cleanVariable = variable
        .replace(/^#|^\//, '') // Remove # and / prefixes
        .split(' ')[0]; // Take first word (variable name)
      
      if (cleanVariable && !['each', 'if', 'unless', 'with'].includes(cleanVariable)) {
        variables.add(cleanVariable);
      }
    }

    return Array.from(variables);
  }
}

export default new TemplateRenderer();
