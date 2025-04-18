/**
 * Enhanced formatter for chatbot responses with intelligent content detection
 * @param {string} rawData - The raw response from the API
 * @param {Object} options - Optional formatting options
 * @return {string} - Formatted HTML string for displaying in the chat
 */
function formatMessage(rawData, options = {}) {
  if (!rawData) return '';

  // Default options
  const defaults = {
    theme: 'light', // 'light' or 'dark'
    accentColor: '#3b82f6', // Primary accent color
    fontClass: 'font-sans', // Font family class
    enableAnimations: true, // Enable animations
  };
  
  const config = { ...defaults, ...options };
  
  // Theme-specific colors
  const colors = config.theme === 'dark' 
    ? {
        background: '#1f2937',
        foreground: '#f9fafb',
        border: '#374151',
        accent: config.accentColor,
        muted: '#9ca3af',
        highlight: '#2d3748'
      }
    : {
        background: '#ffffff',
        foreground: '#111827',
        border: '#e5e7eb',
        accent: config.accentColor,
        muted: '#6b7280',
        highlight: '#f3f4f6'
      };
  
  // Clean the data - handle escaped newlines
  const cleanData = rawData.replace(/\\n/g, '\n');

  // Detect content type
  const hasNumberedList = /\d+\.\s/.test(cleanData);
  const hasBulletPoints = /•|\*\s/.test(cleanData);
  const isProductLike = /available|color|options|finish|size|material|dimensions/i.test(cleanData);
  const hasHeadings = /^#+ .+$/m.test(cleanData);

  // Apply the appropriate formatter based on content type
  if (hasNumberedList) {
    return formatNumberedList(cleanData, isProductLike, colors, config);
  } else if (hasBulletPoints) {
    return formatBulletPoints(cleanData, colors, config);
  } else if (hasHeadings) {
    return formatMarkdown(cleanData, colors, config);
  } else {
    return formatPlainText(cleanData, colors, config);
  }
}

/**
* Formats plain text responses
*/
function formatPlainText(text, colors, config) {
  // Apply paragraph styling
  const formatted = text
    .split(/\n{2,}/)
    .map(para => `<p class="mb-4 leading-relaxed">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  return wrapInContainer(formatted, colors, config);
}

/**
* Formats a numbered list response
*/
function formatNumberedList(response, isProductList, colors, config) {
  // Extract introduction (text before the first numbered item)
  const introMatch = response.match(/^(.*?)(?=1\.\s)/s);
  const introText = introMatch ? introMatch[1].trim() : '';

  // Extract items with regex
  const items = [];
  const itemRegex = /(\d+)\.\s+(.*?)(?=(?:\n\n\d+\.)|$)/gs;
  let match;
  
  while ((match = itemRegex.exec(response + "\n\n")) !== null) {
    const number = match[1];
    const content = match[2].trim();
    items.push({ number, content });
  }

  // If no items found, return with basic formatting
  if (items.length === 0) {
    return formatPlainText(response, colors, config);
  }

  // Find conclusion text (after the last item)
  const lastItemPattern = new RegExp(`${items[items.length - 1].number}\\.\\s+.*?\\n\\n(.*)$`, 's');
  const conclusionMatch = response.match(lastItemPattern);
  const conclusionText = conclusionMatch ? conclusionMatch[1].trim() : '';

  // Format items based on content type
  const formattedItems = items.map(item => {
    if (isProductList) {
      return formatProductItem(item, colors, config);
    } else {
      return formatGenericListItem(item, colors, config);
    }
  }).join('');

  // Create the final formatted response
  const content = `
    ${introText ? `<div class="mb-6 leading-relaxed">${introText.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="list-container space-y-4">
      ${formattedItems}
    </div>
    ${conclusionText ? `<div class="mt-6 leading-relaxed">${conclusionText.replace(/\n/g, '<br>')}</div>` : ''}
  `;
  
  return wrapInContainer(content, colors, config);
}

/**
* Formats a product item with feature extraction
*/
function formatProductItem(item, colors, config) {
  // Extract product name/title
  const titleMatch = item.content.match(/^(.*?)(?:\.|\n|$)/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Look for features
  const features = [];
  const contentLines = item.content.split('\n');
  
  // Feature patterns to look for (expanded)
  const patterns = [
    { regex: /Available in\s*(.*)/i, key: 'Available Sizes' },
    { regex: /Color options(?:\s*include)?[:\s]\s*(.*)/i, key: 'Color Options' },
    { regex: /(?:You can )?[Cc]hoose between\s*(.*)/i, key: 'Options' },
    { regex: /(?:[Ll]eg|[Ff]inish) (?:options|finish)?[:\s]\s*(.*)/i, key: 'Leg Finish' },
    { regex: /[Mm]aterial[:\s]\s*(.*)/i, key: 'Material' },
    { regex: /[Cc]omes with\s*(.*)/i, key: 'Includes' },
    { regex: /(?:(?:is|are) )?[Mm]ade of\s*(.*)/i, key: 'Material' },
    { regex: /[Ss]ize[:\s]\s*(.*)/i, key: 'Size' },
    { regex: /[Dd]imensions[:\s]\s*(.*)/i, key: 'Dimensions' },
    { regex: /[Ff]eatures?[:\s]\s*(.*)/i, key: 'Features' },
    { regex: /[Ss]pecial [Ff]eatures?[:\s]\s*(.*)/i, key: 'Special Features' },
    { regex: /[Pp]rice[:\s]\s*(.*)/i, key: 'Price' },
    { regex: /[Ww]eight[:\s]\s*(.*)/i, key: 'Weight' },
    { regex: /[Rr]ating[:\s]\s*(.*)/i, key: 'Rating' },
    { regex: /[Ww]arranty[:\s]\s*(.*)/i, key: 'Warranty' },
    { regex: /[Aa]ssembly[:\s]\s*(.*)/i, key: 'Assembly' },
    { regex: /[Ss]hipping[:\s]\s*(.*)/i, key: 'Shipping' },
    { regex: /[Dd]elivery[:\s]\s*(.*)/i, key: 'Delivery' },
    { regex: /•\s+(.*?):\s*(.*)/i, keyValueMatch: true }, // Bullet points with key: value format
    { regex: /^\s*•\s+(.*)/im, keyFromBullet: true } // Regular bullet points
  ];
  
  // Extract features from the content
  contentLines.forEach(line => {
    let matched = false;
    
    for (const pattern of patterns) {
      if (pattern.keyValueMatch) {
        // For bullet points with key-value pairs
        const match = line.match(pattern.regex);
        if (match && match[1] && match[2]) {
          features.push({
            key: match[1].trim(),
            value: match[2].trim()
          });
          matched = true;
          break;
        }
      } else if (pattern.keyFromBullet) {
        // For regular bullet points, use the entire content as value
        const match = line.match(pattern.regex);
        if (match && match[1]) {
          features.push({
            key: 'Feature',
            value: match[1].trim()
          });
          matched = true;
          break;
        }
      } else {
        // For standard patterns
        const match = line.match(pattern.regex);
        if (match && match[1]) {
          features.push({
            key: pattern.key,
            value: match[1].trim()
          });
          matched = true;
          break;
        }
      }
    }
    
    // Also check for "key: value" patterns
    if (!matched) {
      const keyValueMatch = line.match(/^\s*([^:]+):\s*(.+)$/);
      if (keyValueMatch && keyValueMatch[1] && keyValueMatch[2]) {
        features.push({
          key: keyValueMatch[1].trim(),
          value: keyValueMatch[2].trim()
        });
      }
    }
  });
  
  // Format the product item with a nice UI
  return `
    <div class="product-item mb-6 p-4 border rounded-lg shadow-sm transition-shadow duration-300 hover:shadow-md" 
         style="border-color: ${colors.border}; background-color: ${colors.background};">
      <h3 class="text-lg font-semibold mb-2" style="color: ${colors.accent};">
        ${item.number}. ${title}
      </h3>
      
      ${features.length > 0 ? `
        <div class="mt-3 grid gap-2">
          ${features.map(feature => `
            <div class="flex flex-wrap py-1 border-b" style="border-color: ${colors.border};">
              <span class="font-medium mr-2 min-w-[140px]" style="color: ${colors.muted};">
                ${feature.key}:
              </span> 
              <span class="flex-1" style="color: ${colors.foreground};">
                ${feature.value}
              </span>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="mt-2 pl-3 leading-relaxed" style="color: ${colors.foreground};">
          ${item.content.substring(title.length + 1).trim().replace(/\n/g, '<br>')}
        </p>
      `}
    </div>
  `;
}

/**
* Formats a generic list item
*/
function formatGenericListItem(item, colors, config) {
  // Extract title and content
  const parts = item.content.split(/\.\s+/);
  const title = parts[0];
  const restContent = parts.slice(1).join('. ').trim();

  const animation = config.enableAnimations ? 
    'transition-all duration-300 hover:translate-x-1' : '';

  return `
    <div class="list-item mb-4 ${animation}">
      <h3 class="text-lg font-semibold" style="color: ${colors.accent};">
        ${item.number}. ${title}
      </h3>
      <div class="pl-6 mt-2 leading-relaxed" style="color: ${colors.foreground};">
        ${restContent ? `<p>${restContent.replace(/\n/g, '<br>')}</p>` : ''}
      </div>
    </div>
  `;
}

/**
* Formats bullet point lists
*/
function formatBulletPoints(response, colors, config) {
  // Split into paragraphs
  const paragraphs = response.split(/\n{2,}/);
  
  const formattedParagraphs = paragraphs.map(para => {
    // If paragraph contains bullet points
    if (/^[•*-]\s+/m.test(para)) {
      const lines = para.split(/\n/);
      let formatted = '';
      let inList = false;
      
      lines.forEach(line => {
        const bulletMatch = line.match(/^([•*-])\s+(.+)$/);
        
        if (bulletMatch) {
          if (!inList) {
            formatted += `<ul class="list-disc pl-5 my-3 space-y-2" style="color: ${colors.foreground};">`;
            inList = true;
          }
          formatted += `<li class="pl-1">${bulletMatch[2]}</li>`;
        } else {
          if (inList) {
            formatted += '</ul>';
            inList = false;
          }
          formatted += `<p class="mb-3">${line}</p>`;
        }
      });
      
      if (inList) {
        formatted += '</ul>';
      }
      
      return formatted;
    } else {
      // Regular paragraph
      return `<p class="mb-4 leading-relaxed" style="color: ${colors.foreground};">${para}</p>`;
    }
  }).join('');
  
  return wrapInContainer(formattedParagraphs, colors, config);
}

/**
* Formats Markdown-like content
*/
function formatMarkdown(text, colors, config) {
  let formatted = text;
  
  // Headers
  formatted = formatted.replace(/^# (.+)$/gm, `<h1 class="text-2xl font-bold mb-4 mt-6" style="color: ${colors.accent};">$1</h1>`);
  formatted = formatted.replace(/^## (.+)$/gm, `<h2 class="text-xl font-bold mb-3 mt-5" style="color: ${colors.accent};">$1</h2>`);
  formatted = formatted.replace(/^### (.+)$/gm, `<h3 class="text-lg font-bold mb-2 mt-4" style="color: ${colors.accent};">$1</h3>`);
  
  // Bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`);
  
  // Italic
  formatted = formatted.replace(/\*(.+?)\*/g, `<em>$1</em>`);
  
  // Code
  formatted = formatted.replace(/`(.+?)`/g, `<code class="px-1 py-0.5 rounded" style="background-color: ${colors.highlight};">$1</code>`);
  
  // Apply paragraph styling
  formatted = formatted.split(/\n{2,}/)
    .map(para => {
      if (para.startsWith('<h') || para.startsWith('<ul')) {
        return para;
      }
      return `<p class="mb-4 leading-relaxed" style="color: ${colors.foreground};">${para.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
  
  return wrapInContainer(formatted, colors, config);
}

/**
* Wraps content in a container with consistent styling
*/
function wrapInContainer(content, colors, config) {
  const containerStyle = `
    background-color: ${colors.background}; 
    color: ${colors.foreground};
  `;
  
  // Animation classes if enabled
  const animationClass = config.enableAnimations ? 
    'animate-fade-in' : '';
  
  return `
    <div class="message-container ${config.fontClass} ${animationClass}" style="${containerStyle}">
      ${content}
    </div>
  `;
}

// Additional CSS animations to use in your stylesheet
const cssAnimations = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
`;

export default formatMessage;