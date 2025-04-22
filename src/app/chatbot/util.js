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
    accentColor: '#000', // Primary accent color
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
  const hasBulletPoints = /•|\*\s|-\s/.test(cleanData);
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
  const introMatch = response.match(/^(.*?)(?=\*\*1\.\*\*|\*\*1\.\s\*\*|1\.\s)/s);
  const introText = introMatch ? introMatch[1].trim() : '';

  // Check for the special pattern where numbers are bold but items are on separate lines
  const hasBoldNumbersPattern = response.match(/\*\*\d+\.\*\*\s*\n\s*[^*\d\n]+/);
  
  if (hasBoldNumbersPattern) {
    return formatBoldNumbersList(response, introText, colors, config);
  }

  // Check if we have a simple numbered list (no bold formatting)
  const hasSimpleList = !response.includes('**') && response.match(/\d+\.\s+[^\n]+/g);
  if (hasSimpleList) {
    return formatSimpleNumberedList(response, colors, config);
  }

  // Find the numbered list pattern
  const numberedPattern = /(\d+)\.\s+/g;
  let allMatches = [...response.matchAll(numberedPattern)];
  
  // If no matches, return with basic formatting
  if (allMatches.length === 0) {
    return formatPlainText(response, colors, config);
  }

  // Extract the items
  const items = [];
  for (let i = 0; i < allMatches.length; i++) {
    const currentMatch = allMatches[i];
    const number = currentMatch[1];
    const startPos = currentMatch.index + currentMatch[0].length;
    
    // Determine where this item ends
    let endPos;
    if (i < allMatches.length - 1) {
      // If not the last item, end before the next numbered item
      endPos = allMatches[i+1].index;
    } else {
      // For the last item, we need to find where it truly ends before any conclusion text
      const textAfterLastNumber = response.substring(startPos);
      
      // Check for a double newline which would indicate conclusion text
      const doubleNewlineMatch = textAfterLastNumber.match(/\n\s*\n/);
      
      if (doubleNewlineMatch) {
        endPos = startPos + doubleNewlineMatch.index;
      } else {
        endPos = response.length;
      }
    }
    
    const content = response.substring(startPos, endPos).trim();
    items.push({ number, content });
  }

  // Find conclusion text (after the last numbered item and after any double newlines)
  const lastItemEndPos = allMatches[allMatches.length-1].index + 
                         allMatches[allMatches.length-1][0].length + 
                         items[items.length-1].content.length;
  
  let conclusionText = '';
  const remainingText = response.substring(lastItemEndPos).trim();
  
  if (remainingText && remainingText.match(/^\s*\n\s*\n/)) {
    conclusionText = remainingText.replace(/^\s*\n\s*\n/, '').trim();
  } else if (remainingText && !remainingText.match(/\d+\.\s+/)) {
    // If there's text after the last item and it's not another numbered item
    conclusionText = remainingText.trim();
  }

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
    ${introText ? `<div class="leading-relaxed px-[10px] py-[2px] text-[14px]">${introText.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="list-container m-2">
      ${formattedItems}
    </div>
    ${conclusionText ? `<div class="mt-[2px] leading-relaxed px-[10px] py-[2px] text-[14px]">${conclusionText.replace(/\n/g, '<br>')}</div>` : ''}
  `;
  
  return wrapInContainer(content, colors, config);
}

/**
* Format a simple numbered list where items should appear on the same line as their numbers
*/
function formatSimpleNumberedList(response, colors, config) {
  // Extract introduction (text before the first numbered item)
  const introMatch = response.match(/^(.*?)(?=1\.\s)/s);
  const introText = introMatch ? introMatch[1].trim() : '';
  
  // Find and extract all numbered list items
  const listItemRegex = /(\d+)\.\s+([^\d\n][^\n]*)/g;
  const matches = [...response.matchAll(listItemRegex)];
  const items = matches.map(match => ({
    number: match[1],
    content: match[2].trim()
  }));
  
  // Find the conclusion text - everything after the last list item
  let conclusionText = '';
  
  if (items.length > 0) {
    // Find the position of the last list item
    const lastMatch = matches[matches.length - 1];
    const lastItemEndPos = lastMatch.index + lastMatch[0].length;
    
    // Everything after the last list item is the conclusion
    if (lastItemEndPos < response.length) {
      // Find where the real conclusion starts - it should be after a newline
      const textAfterLastItem = response.substring(lastItemEndPos);
      const conclusionMatch = textAfterLastItem.match(/\n(.*)/s);
      if (conclusionMatch) {
        conclusionText = conclusionMatch[1].trim();
      }
    }
  }
  
  // Format the simple list items
  const formattedItems = items.map(item => `
    <div class="simple-list-item mb-2">
      <p class="pl-1 leading-relaxed" style="color: ${colors.foreground};">
        <span style="font-weight: normal;">${item.number}.</span> ${item.content}
      </p>
    </div>
  `).join('');
  
  // Create the final response
  const content = `
    ${introText ? `<div class=" leading-relaxed p-[10px]">${introText.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="simple-list-container m-2">
      ${formattedItems}
    </div>
    ${conclusionText ? `<div class=" leading-relaxed p-[10px]">${conclusionText.replace(/\n/g, '<br>')}</div>` : ''}
  `;
  
  return wrapInContainer(content, colors, config);
}


/**
* Format a list where the numbers are bold but items are on separate lines
*/
function formatBoldNumbersList(response, introText, colors, config) {
  // Match the pattern: **number.** followed by newline and content
  const pattern = /\*\*(\d+)\.(?:\*\*|\s\*\*)\s*\n\s*([^*\d\n][^\n]*)/g;
  let match;
  const items = [];
  
  while ((match = pattern.exec(response)) !== null) {
    items.push({
      number: match[1],
      content: match[2].trim()
    });
  }
  
  // If we couldn't extract items with this pattern, fall back to normal formatting
  if (items.length === 0) {
    return formatPlainText(response, colors, config);
  }
  
  // Find the conclusion text (text after all numbered items)
  const lastItemPos = response.lastIndexOf(`**${items[items.length-1].number}.`);
  const lastItemContent = items[items.length-1].content;
  const textAfterLastItem = response.substring(lastItemPos + lastItemContent.length + 10); // approximate offset
  
  // Extract conclusion from text after the last item
  let conclusionText = '';
  const conclusionMatch = textAfterLastItem.match(/\n\s*\n([\s\S]+)$/);
  if (conclusionMatch) {
    conclusionText = conclusionMatch[1].trim();
  }
  
  // Create a simple list with the items on the same line as their numbers
  const formattedItems = items.map(item => `
    <div class="simple-list-item mb-2">
      <p class="pl-1 leading-relaxed" style="color: ${colors.foreground};">
        <span style="color: ${colors.accent}; font-weight: 500;">${item.number}.</span> ${item.content}
      </p>
    </div>
  `).join('');
  
  // Create the final formatted response
  const content = `
    ${introText ? `<div class=" leading-relaxed p-[10px]">${introText.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="simple-list-container m-2">
      ${formattedItems}
    </div>
    ${conclusionText ? `<div class=" leading-relaxed p-[10px]">${conclusionText.replace(/\n/g, '<br>')}</div>` : ''}
  `;
  
  return wrapInContainer(content, colors, config);
}


/**
* Formats a product item with feature extraction and handles bold headings properly
*/
// function formatProductItem(item, colors, config) {
//   // Extract bold titles - handling multiple bold segments with "and" between them
//   const boldMatches = item.content.match(/\*\*(.*?)\*\*/g);
//   let title = '';
//   let remainingContent = item.content;
  
//   if (boldMatches && boldMatches.length > 0) {
//     // Handle multiple bold segments separated by "and"
//     const combinedTitle = boldMatches
//       .map(match => match.replace(/\*\*/g, '').trim())
//       .join(' and ');
    
//     title = combinedTitle;
    
//     // Replace all bold titles from the content to prevent duplication
//     boldMatches.forEach(match => {
//       remainingContent = remainingContent.replace(match, '');
//     });
    
//     // Clean up potential remaining "and" word if it was between bold segments
//     remainingContent = remainingContent.replace(/\s+and\s+/g, ' ').trim();
    
//     // Remove any colons that might be at the end of the content
//     remainingContent = remainingContent.replace(/:\s*$/, '');
//   }
  
//   // Remove any trailing colons from the content
//   remainingContent = remainingContent.replace(/:\s*$/, '');
  
//   // Process bullet points/list items after the title
//   const bulletPointsMatch = remainingContent.match(/(?:[-•*]\s+.*(?:\n|$))+/g);
//   let listItems = [];
  
//   if (bulletPointsMatch) {
//     // Process all bullet point groups
//     bulletPointsMatch.forEach(bulletGroup => {
//       // Extract individual bullet points
//       const bulletItems = bulletGroup.match(/[-•*]\s+(.*?)(?:\n|$)/g);
//       if (bulletItems) {
//         bulletItems.forEach(item => {
//           const cleanItem = item.replace(/^[-•*]\s+/, '').trim();
//           if (cleanItem) {
//             listItems.push(cleanItem);
//           }
//         });
//       }
//     });
//   }
  
//   // Look for sections with colons (Key: Value format)
//   const features = [];
//   const contentLines = remainingContent.split('\n');
  
//   // Feature patterns to look for (expanded)
//   const patterns = [
//     { regex: /Available Sizes[:\s]\s*(.*)/i, key: 'Available Sizes' },
//     { regex: /^Available in\s*(.*)/i, key: 'Available Models' },
//     { regex: /Color options(?:\s*include)?[:\s]\s*(.*)/i, key: 'Color Options' },
//     { regex: /(?:You can )?[Cc]hoose between\s*(.*)/i, key: 'Options' },
//     { regex: /(?:[Ll]eg|[Ff]inish) (?:options|finish)?[:\s]\s*(.*)/i, key: 'Leg Finish' },
//     { regex: /[Mm]aterial[:\s]\s*(.*)/i, key: 'Material' },
//     { regex: /[Cc]omes with\s*(.*)/i, key: 'Includes' },
//     { regex: /(?:(?:is|are) )?[Mm]ade of\s*(.*)/i, key: 'Material' },
//     { regex: /[Ss]ize[:\s]\s*(.*)/i, key: 'Size' },
//     { regex: /[Dd]imensions[:\s]\s*(.*)/i, key: 'Dimensions' },
//     { regex: /[Ff]eatures?[:\s]\s*(.*)/i, key: 'Features' },
//     { regex: /[Ss]pecial [Ff]eatures?[:\s]\s*(.*)/i, key: 'Special Features' },
//     { regex: /[Pp]rice[:\s]\s*(.*)/i, key: 'Price' },
//     { regex: /[Ww]eight[:\s]\s*(.*)/i, key: 'Weight' },
//     { regex: /[Rr]ating[:\s]\s*(.*)/i, key: 'Rating' },
//     { regex: /[Ww]arranty[:\s]\s*(.*)/i, key: 'Warranty' },
//     { regex: /[Aa]ssembly[:\s]\s*(.*)/i, key: 'Assembly' },
//     { regex: /[Ss]hipping[:\s]\s*(.*)/i, key: 'Shipping' },
//     { regex: /[Dd]elivery[:\s]\s*(.*)/i, key: 'Delivery' }
//   ];
  
//   // Extract features from the content lines
//   contentLines.forEach(line => {
//     if (!line.trim() || line.trim() === ':') return; // Skip empty lines or just colon
    
//     // Skip lines that start with bullet points, as we've handled them separately
//     if (/^\s*[-•*]/.test(line)) return;
    
//     let matched = false;
    
//     // Check against our predefined patterns
//     for (const pattern of patterns) {
//       const match = line.match(pattern.regex);
//       if (match && match[1]) {
//         features.push({
//           key: pattern.key,
//           value: match[1].trim()
//         });
//         matched = true;
//         break;
//       }
//     }
    
//     // Also check for "key: value" patterns
//     if (!matched) {
//       const keyValueMatch = line.match(/^\s*([^:]+):\s*(.+)$/);
//       if (keyValueMatch && keyValueMatch[1] && keyValueMatch[2]) {
//         features.push({
//           key: keyValueMatch[1].trim(),
//           value: keyValueMatch[2].trim()
//         });
//       } else if (line.trim() && line.trim() !== ':') {
//         // If it's not a key-value pair but still contains text, add it as a description
//         features.push({
//           key: "",
//           value: line.trim()
//         });
//       }
//     }
//   });
  
//   // Filter out empty features or just colons
//   const filteredFeatures = features.filter(feature => 
//     (feature.key !== "" || feature.value.trim() !== "") && 
//     feature.value.trim() !== ':'
//   );
  
//   // Format the product item with a clean UI
//   return `
//     <div class="product-item  px-4 py-[2px]"
//          style="border-color: ${colors.border}; background-color: ${colors.background};">
//       <h3 class="text-[16px] font-semibold mb-2" style="color: ${colors.accent};">
//         ${item.number}. ${title}
//       </h3>
      
//       ${listItems.length > 0 ? `
//         <ul class="list-disc pl-8 mt-2 space-y-1 mb-3 text-[14px]">
//           ${listItems.map(item => `<li style="color: ${colors.foreground};">${item}</li>`).join('')}
//         </ul>
//       ` : ''}
      
//       ${filteredFeatures.length > 0 ? `
//         <div class="mt-3 grid ">
//           ${filteredFeatures.map(feature => 
//             feature.key ? `
//               <div class="flex flex-wrap py-1" style="color: ${colors.foreground};">
//                 <span class="font-medium mr-2 min-w-[235px]" style="color: ${colors.muted};">
//                   ${feature.key}:
//                 </span> 
//                 <span class="flex-1">
//                   ${feature.value}
//                 </span>
//               </div>
//             ` : `
//               <div class="py-1 text-[14px]" style="color: ${colors.foreground};">
//                 ${feature.value}
//               </div>
//             `
//           ).join('')}
//         </div>
//       ` : ''}
      
//       ${listItems.length === 0 && filteredFeatures.length === 0 ? `
//         <p class="mt-2 pl-3 leading-relaxed" style="color: ${colors.foreground};">
//           ${remainingContent.replace(/\n/g, '<br>')}
//         </p>
//       ` : ''}
//     </div>
//   `;
// }
/**
* Formats a product item with feature extraction and handles bold headings properly
* This version fixes issues with product codes containing numbers being wrongly formatted as bold
*/
function formatProductItem(item, colors, config) {
  // First, identify and collect all the proper bold product headings
  // These typically follow the pattern: "**number. Product Name**"
  const headerBoldPattern = /\*\*(\d+\.\s+[^*]+)\*\*/g;
  const headerMatches = [...item.content.matchAll(headerBoldPattern)];
  
  let title = '';
  let remainingContent = item.content;
  
  if (headerMatches.length > 0) {
    // We found a proper product heading
    const headerMatch = headerMatches[0];
    title = headerMatch[1].trim();
    
    // Remove the header from the content
    remainingContent = remainingContent.replace(headerMatch[0], '');
  } else {
    // Fall back to the old method if we don't find a proper header pattern
    const boldMatches = item.content.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches && boldMatches.length > 0) {
      // Filter out any bold matches that look like they might be product codes
      // (short bold text that's mostly numbers)
      const titleMatches = boldMatches.filter(match => {
        const content = match.replace(/\*\*/g, '').trim();
        // If it's a short bold text with periods or mostly numbers, it's likely a product code
        return !(content.length < 10 && (/^\d+\.?$/.test(content) || /\d/.test(content) && content.replace(/\D/g, '').length > content.length / 2));
      });
      
      if (titleMatches.length > 0) {
        title = titleMatches.map(match => match.replace(/\*\*/g, '').trim()).join(' and ');
        
        // Remove the title matches from the content
        titleMatches.forEach(match => {
          remainingContent = remainingContent.replace(match, '');
        });
      }
    }
  }
  
  // Clean up colons and other formatting issues
  remainingContent = remainingContent.trim();
  
  // Remove any standalone bold numbers that might be product codes
  // This regex looks for bold patterns that are just numbers, possibly with a period
  remainingContent = remainingContent.replace(/\*\*(\d+\.?)\*\*/g, '$1');
  
  // Remove any leading colons from the content
  remainingContent = remainingContent.replace(/^\s*:\s*/, '');
  
  // Process bullet points/list items after the title
  const bulletPointsMatch = remainingContent.match(/(?:[-•*]\s+.*(?:\n|$))+/g);
  let listItems = [];
  
  if (bulletPointsMatch) {
    // Process all bullet point groups
    bulletPointsMatch.forEach(bulletGroup => {
      // Extract individual bullet points
      const bulletItems = bulletGroup.match(/[-•*]\s+(.*?)(?:\n|$)/g);
      if (bulletItems) {
        bulletItems.forEach(item => {
          const cleanItem = item.replace(/^[-•*]\s+/, '').trim();
          if (cleanItem) {
            listItems.push(cleanItem);
          }
        });
      }
    });
  }
  
  // Look for "Available in" pattern which is common in your product data
  const availableInMatch = remainingContent.match(/Available\s+in\s+(.*?)(?=\n\n|$)/is);
  let featuredContent = '';
  
  if (availableInMatch) {
    // Extract and clean up the "Available in" content
    featuredContent = availableInMatch[1].trim();
    
    // Clean up any remaining bold markers in the product codes
    featuredContent = featuredContent.replace(/\*\*(\d+\.?)\*\*/g, '$1');
  } else {
    // If no "Available in" pattern, just use the remaining content
    featuredContent = remainingContent;
  }
  
  // Format the product item with a clean UI
  return `
    <div class="product-item px-4 py-[2px]"
         style="border-color: ${colors.border}; background-color: ${colors.background};">
      <h3 class="text-[16px] font-semibold mb-2" style="color: ${colors.accent};">
        ${item.number}. ${title}
      </h3>
      
      ${listItems.length > 0 ? `
        <ul class="list-disc pl-8 mt-2 space-y-1 mb-3 text-[14px]">
          ${listItems.map(item => `<li style="color: ${colors.foreground};">${item}</li>`).join('')}
        </ul>
      ` : `
        <div class="py-1 text-[14px]" style="color: ${colors.foreground};">
          ${availableInMatch ? `Available in ${featuredContent}` : featuredContent}
        </div>
      `}
    </div>
  `;
}

/**
* Formats a generic list item with support for nested headings
*/
function formatGenericListItem(item, colors, config) {
  // Check for pattern with main category and sub-categories
  // Example: "1. **White Shades**: - **Clean White**: Description - **Creme White**: Description"
  const mainCategoryPattern = /\*\*(.*?):\*\*\s+(.*)/s;
  const mainCategoryMatch = item.content.match(mainCategoryPattern);
  
  if (mainCategoryMatch) {
    // We have a main category with sub-items
    const mainHeading = mainCategoryMatch[1].trim();
    const content = mainCategoryMatch[2].trim();
    
    // Extract sub-categories with their descriptions
    const subItemPattern = /-\s+\*\*(.*?):\*\*\s+(.*?)(?=\s+-\s+\*\*|$)/gs;
    const subItems = [...content.matchAll(subItemPattern)];
    
    if (subItems.length > 0) {
      // Format as a nested list with main category as heading and sub-categories as list items
      const formattedSubItems = subItems.map(match => {
        const subHeading = match[1].trim();
        const subDescription = match[2].trim();
        
        return `
          <div class="sub-item my-2">
            <p class="font-medium" style="color: ${colors.foreground};">
              <span style="color: ${colors.accent};">${subHeading}:</span> ${subDescription}
            </p>
          </div>
        `;
      }).join('');
      
      return `
        <div class="list-item mb-4">
          <h3 class="text-lg font-semibold" style="color: ${colors.accent};">
            ${item.number}. ${mainHeading}
          </h3>
          <div class="pl-6 mt-2 leading-relaxed text-[14px]" style="color: ${colors.foreground};">
            ${formattedSubItems}
          </div>
        </div>
      `;
    }
  }
  
  // If not a nested structure, fall back to standard formatting
  // Extract bold titles - handling multiple bold segments with "and" between them
  const boldMatches = item.content.match(/\*\*(.*?)\*\*/g);
  let title = '';
  let remainingContent = item.content;
  let hasBoldTitle = false;
  
  if (boldMatches && boldMatches.length > 0) {
    // Handle multiple bold segments separated by "and"
    const combinedTitle = boldMatches
      .map(match => match.replace(/\*\*/g, '').trim())
      .join(' and ');
    
    title = combinedTitle;
    hasBoldTitle = true;
    
    // Replace all bold titles from the content to prevent duplication
    boldMatches.forEach(match => {
      remainingContent = remainingContent.replace(match, '');
    });
    
    // Clean up potential remaining "and" word if it was between bold segments
    remainingContent = remainingContent.replace(/\s+and\s+/g, ' ').trim();
    
    // Remove any colons that might be at the end of the title
    if (title.endsWith(':')) {
      title = title.substring(0, title.length - 1);
    }
  } else {
    // Check if the content has multiple lines
    const lines = item.content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length > 1) {
      // First line might be a title
      title = lines[0].trim();
      remainingContent = lines.slice(1).join('\n').trim();
    } else {
      // Single line - treat as normal content, no separate title
      title = '';
      remainingContent = item.content;
    }
  }
  
  // Process bullet points/list items after the title
  const bulletPoints = [];
  const contentLines = remainingContent.split('\n');
  let currentList = [];
  
  contentLines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^[-•*]\s+/)) {
      // This is a bullet point
      currentList.push(trimmedLine.replace(/^[-•*]\s+/, ''));
    } else if (trimmedLine && currentList.length > 0) {
      // This is text belonging to the previous bullet point
      if (currentList.length > 0) {
        currentList[currentList.length - 1] += ' ' + trimmedLine;
      } else {
        // Regular line (not part of a bullet point)
        if (trimmedLine) bulletPoints.push({ type: 'text', content: trimmedLine });
      }
    } else if (trimmedLine) {
      // Regular line (not part of a bullet point)
      bulletPoints.push({ type: 'text', content: trimmedLine });
    }
  });
  
  if (currentList.length > 0) {
    bulletPoints.push({ type: 'list', items: currentList });
  }
  
  // If there's no bold title and we determined there's also no multi-line title,
  // display as a simple list item with number and content on the same line
  if (!hasBoldTitle && title === '') {
    return `
      <div class="list-item mb-3">
        <p class="pl-1 leading-relaxed" style="color: ${colors.foreground};">
          <span style="color: ${colors.accent}; font-weight: 500;">${item.number}.</span> ${remainingContent}
        </p>
      </div>
    `;
  } else {
    // For bold titles or multi-line items, use the original formatting
    return `
      <div class="list-item mb-4">
        <h3 class="text-lg font-semibold" style="color: ${colors.accent};">
          ${item.number}. ${title}
        </h3>
        <div class="pl-6 mt-2 leading-relaxed" style="color: ${colors.foreground};">
          ${bulletPoints.map(point => {
            if (point.type === 'list') {
              return `
                <ul class="list-disc pl-4 my-2 space-y-1 text-[14px]">
                  ${point.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
              `;
            } else {
              return `<p class="mb-2">${point.content}</p>`;
            }
          }).join('')}
        </div>
      </div>
    `;
  }
}

/**
* Formats a generic list item
*/
// function formatGenericListItem(item, colors, config) {
//   // Extract bold titles - handling multiple bold segments with "and" between them
//   const boldMatches = item.content.match(/\*\*(.*?)\*\*/g);
//   let title = '';
//   let remainingContent = item.content;
//   let hasBoldTitle = false;
  
//   if (boldMatches && boldMatches.length > 0) {
//     // Handle multiple bold segments separated by "and"
//     const combinedTitle = boldMatches
//       .map(match => match.replace(/\*\*/g, '').trim())
//       .join(' and ');
    
//     title = combinedTitle;
//     hasBoldTitle = true;
    
//     // Replace all bold titles from the content to prevent duplication
//     boldMatches.forEach(match => {
//       remainingContent = remainingContent.replace(match, '');
//     });
    
//     // Clean up potential remaining "and" word if it was between bold segments
//     remainingContent = remainingContent.replace(/\s+and\s+/g, ' ').trim();
    
//     // Remove the colon if it exists in the title - we'll add it back if needed
//     if (title.endsWith(':')) {
//       title = title.substring(0, title.length - 1);
//     }
//   } else {
//     // Check if the content has multiple lines
//     const lines = item.content.split('\n').filter(line => line.trim() !== '');
    
//     if (lines.length > 1) {
//       // First line might be a title
//       title = lines[0].trim();
//       remainingContent = lines.slice(1).join('\n').trim();
//     } else {
//       // Single line - treat as normal content, no separate title
//       title = '';
//       remainingContent = item.content;
//     }
//   }
  
//   // Process bullet points/list items after the title
//   const bulletPoints = [];
//   const contentLines = remainingContent.split('\n');
//   let currentList = [];
  
//   contentLines.forEach(line => {
//     const trimmedLine = line.trim();
//     if (trimmedLine.match(/^[-•*]\s+/)) {
//       // This is a bullet point
//       currentList.push(trimmedLine.replace(/^[-•*]\s+/, ''));
//     } else if (trimmedLine && currentList.length > 0) {
//       // This is text belonging to the previous bullet point
//       if (currentList.length > 0) {
//         currentList[currentList.length - 1] += ' ' + trimmedLine;
//       } else {
//         // Regular line (not part of a bullet point)
//         if (trimmedLine) bulletPoints.push({ type: 'text', content: trimmedLine });
//       }
//     } else if (trimmedLine) {
//       // Regular line (not part of a bullet point)
//       bulletPoints.push({ type: 'text', content: trimmedLine });
//     }
//   });
  
//   if (currentList.length > 0) {
//     bulletPoints.push({ type: 'list', items: currentList });
//   }
  
//   // If there's no bold title and we determined there's also no multi-line title,
//   // display as a simple list item with number and content on the same line
//   if (!hasBoldTitle && title === '') {
//     return `
//       <div class="list-item mb-3">
//         <p class="pl-1 leading-relaxed" style="color: ${colors.foreground};">
//           <span style="color: ${colors.accent}; font-weight: 500;">${item.number}.</span> ${remainingContent}
//         </p>
//       </div>
//     `;
//   } else {
//     // For bold titles or multi-line items, use the original formatting
//     return `
//       <div class="list-item mb-4">
//         <h3 class="text-lg font-semibold" style="color: ${colors.accent};">
//           ${item.number}. ${title}
//         </h3>
//         <div class="pl-6 mt-2 leading-relaxed" style="color: ${colors.foreground};">
//           ${bulletPoints.map(point => {
//             if (point.type === 'list') {
//               return `
//                 <ul class="list-disc pl-4 my-2 space-y-0">
//                   ${point.items.map(item => `<li>${item}</li>`).join('')}
//                 </ul>
//               `;
//             } else {
//               return `<p class="mb-2">${point.content}</p>`;
//             }
//           }).join('')}
//         </div>
//       </div>
//     `;
//   }
// }


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


export default formatMessage;