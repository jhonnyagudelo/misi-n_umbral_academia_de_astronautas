import {createElement,type ReactElement,type ReactNode} from 'react';
import {describe,it,expect} from 'vitest';
import {localizeTree} from './Localized';
describe('presentation boundary',()=>{
  it('translates adjacent interpolated words together so English order is correct',()=>{
    const translated=localizeTree(createElement('button',null,'¿Qué hace ','Aire','?'),'en') as ReactElement<{children:ReactNode}>;
    expect(translated.props.children).toEqual(['What does Air do?']);
  });
  it('translates readable text while preserving IDs, values, URLs and handlers',()=>{
    const handler=()=>{};const original=createElement('button',{children:'Aire',id:'Aire',value:'Aire',onClick:handler,'aria-label':'Aire'},'Aire');
    const translated=localizeTree(original,'en') as typeof original;
    expect(translated.props.children).toBe('Air');expect(translated.props['aria-label']).toBe('Air');
    expect(translated.props.id).toBe('Aire');expect(translated.props.value).toBe('Aire');expect(translated.props.onClick).toBe(handler);expect(original.props.children).toBe('Aire');
  });
  it('returns original Spanish and respects explicit no-translate controls',()=>{
    const original=createElement('span',{'data-no-translate':true},'Español');expect(localizeTree(original,'en')).toBe(original);
    const spanish=localizeTree(createElement('p',null,'Aire'),'es') as ReactElement<{children:ReactNode}>;expect(spanish.props.children).toBe('Aire');
  });
});
