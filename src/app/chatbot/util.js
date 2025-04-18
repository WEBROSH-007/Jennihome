// function formatSleeperSofas(rawData) {
//     // Replace escaped newline characters with actual line breaks
//     const cleanData = rawData.replace(/\\n/g, '\n');
  
//     // Split into separate items
//     const items = cleanData.split(/\n\d+\.\s/).filter(Boolean);
  
//     // Reattach numbering and format
//     const formattedItems = items.map((item, index) => {
//       const formatted = item
//         .replace(/Available in/g, '\n  • Available in')
//         .replace(/Color options include/g, '\n  • Color options:')
//         .replace(/You can choose between/g, '\n  • Leg finish options:')
//         .replace(/It comes with/g, '\n  • Comes with')
//         .replace(/and is made of/g, '\n  • Material:');
  
//       return `${index + 1}. ${formatted}`;
//     });
  
//     return formattedItems.join('\n\n');
//   }
  
//   export default  formatSleeperSofas;


// utils/formatMessage.js

/**
 * Enhanced formatter for chatbot responses with intelligent content detection
 * @param {string} rawData - The raw response from the API
 * @return {string} - Formatted HTML string for displaying in the chat
 */
function formatMessage(rawData) {
    if (!rawData) return '';
  
    // Clean the data - handle escaped newlines
    const cleanData = rawData.replace(/\\n/g, '\n');
  
    // Detect content type
    const hasNumberedList = /\d+\.\s/.test(cleanData);
    const hasBulletPoints = /•|\*\s/.test(cleanData);
    const isProductLike = /available|color|options|finish|size|material/i.test(cleanData);
  
    // If it's a numbered list (most common for product descriptions)
    if (hasNumberedList) {
      return formatNumberedList(cleanData, isProductLike);
    }
  
    // For bullet points
    if (hasBulletPoints) {
      return formatBulletPoints(cleanData);
    }
  
    // For simple text responses
    return applyBasicFormatting(cleanData);
  }
  
  /**
   * Applies basic text formatting
   */
  function applyBasicFormatting(text) {
    return text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n(?!\n)/g, '<br>');
  }
  
  /**
   * Formats a numbered list response
   */
  function formatNumberedList(response, isProductList = false) {
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
      return applyBasicFormatting(response);
    }
  
    // Find conclusion text (after the last item)
    const lastItemPattern = new RegExp(`${items[items.length - 1].number}\\.\\s+.*?\\n\\n(.*)$`, 's');
    const conclusionMatch = response.match(lastItemPattern);
    const conclusionText = conclusionMatch ? conclusionMatch[1].trim() : '';
  
    // Format items based on content type
    const formattedItems = items.map(item => {
      if (isProductList) {
        return formatProductItem(item);
      } else {
        return formatGenericItem(item);
      }
    }).join('');
  
    // Create the final formatted response
    return `
      <div class="response-container">
        ${introText ? `<p class="mb-3">${introText}</p>` : ''}
        <div class="list-container">
          ${formattedItems}
        </div>
        ${conclusionText ? `<p class="mt-3">${conclusionText}</p>` : ''}
      </div>
    `;
  }
  
  /**
   * Formats a product item with feature extraction
   */
  function formatProductItem(item) {
    // Extract product name/title
    const firstSentence = item.content.split('.')[0];
    
    // Look for features
    const features = [];
    const contentLines = item.content.split('\n');
    
    // Feature patterns to look for
    const patterns = [
      { regex: /Available in\s*(.*)/i, key: 'Available Sizes' },
      { regex: /Color options(?:\s*include)?[:\s]\s*(.*)/i, key: 'Color Options' },
      { regex: /(?:You can )?[Cc]hoose between\s*(.*)/i, key: 'Options' },
      { regex: /(?:[Ll]eg|[Ff]inish) (?:options|finish)[:\s]\s*(.*)/i, key: 'Leg Finish' },
      { regex: /[Mm]aterial[:\s]\s*(.*)/i, key: 'Material' },
      { regex: /[Cc]omes with\s*(.*)/i, key: 'Includes' },
      { regex: /(?:(?:is|are) )?[Mm]ade of\s*(.*)/i, key: 'Material' },
      { regex: /[Ss]ize[:\s]\s*(.*)/i, key: 'Size' },
      { regex: /[Dd]imensions[:\s]\s*(.*)/i, key: 'Dimensions' },
      { regex: /[Ff]eatures?[:\s]\s*(.*)/i, key: 'Features' },
      { regex: /[Ss]pecial [Ff]eatures?[:\s]\s*(.*)/i, key: 'Special Features' }
    ];
    
    // Extract features from the content
    contentLines.forEach(line => {
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          features.push({
            key: pattern.key,
            value: match[1].trim()
          });
          break;
        }
      }
    });
    
    // If no features were extracted with the patterns, try to intelligently parse the content
    if (features.length === 0) {
      // Split into sentences and look for potential features
      const sentences = item.content.split(/\.(?:\s+|\n)/).filter(s => s.trim());
      
      sentences.slice(1).forEach(sentence => {
        const colonMatch = sentence.match(/(.*?):\s*(.*)/);
        if (colonMatch) {
          features.push({
            key: colonMatch[1].trim(),
            value: colonMatch[2].trim()
          });
        }
      });
    }
  
    // Format the product item with a nicer UI
    return `
      <div class="product-item mb-4 p-3 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <h4 class=" text-black">${item.number}. ${firstSentence}</h4>
        ${features.length > 0 ? `
          <div class=" mt-2">
            ${features.map(feature => 
              `<div class="flex py-1 flex-wrap">
                <span class="font-medium min-w-[150px] mr-2">${feature.key}:</span> 
                <span class="flex-1">${feature.value}</span>
              </div>`
            ).join('')}
          </div>
        ` : `
          <p class="pl-3 mt-1">${item.content.substring(firstSentence.length + 1).trim()}</p>
        `}
      </div>
    `;
  }
  
  /**
   * Formats a generic list item
   */
  function formatGenericItem(item) {
    // Extract title and content
    const parts = item.content.split('.');
    const title = parts[0];
    const restContent = parts.slice(1).join('.').trim();
  
    return `
      <div class="mb-4">
        <h4 class="font-bold text-blue-600">${item.number}. ${title}</h4>
        <div class="pl-4 mt-1">
          <p>${restContent}</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Formats bullet point lists
   */
  function formatBulletPoints(response) {
    // Replace bullet symbols with HTML list items
    let formatted = response
      .replace(/•\s+([^\n]+)/g, '<li>$1</li>')
      .replace(/\*\s+([^\n]+)/g, '<li>$1</li>');
    
    // Wrap lists in ul tags
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(
        /(<li>.*?<\/li>)+/gs, 
        match => `<ul class="list-disc pl-5 my-3">${match}</ul>`
      );
    }
    
    // Format any remaining text
    formatted = formatted.replace(/(?<!<\/li>)\n\n(?!<li>)/g, '<br><br>');
    
    return formatted;
  }
  
  export default formatMessage;