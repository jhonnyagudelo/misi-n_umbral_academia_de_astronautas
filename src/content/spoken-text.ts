// Parenthesized map locators are visual aids; task steps and measurements stay.
export function spokenText(text:string){
  return text.replace(/\s*\((?:[1-9]|10)\)/g,'').replace(/\bSitio\s+(?:10|[1-9])\s*[·:.-]?\s*/gi,'').replace(/\s+/g,' ').trim();
}
