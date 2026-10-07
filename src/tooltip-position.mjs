// Keep the whole tooltip readable, including when its trigger is near a screen edge.
export function tooltipPosition(anchor,height,viewportWidth,viewportHeight){
 const margin=16,width=Math.min(280,viewportWidth-margin*2),maxHeight=viewportHeight-margin*2;
 const renderedHeight=Math.min(height,maxHeight);
 const below=anchor.bottom+8,above=anchor.top-renderedHeight-8;
 return {
  position:'fixed',width,maxHeight,overflowY:'auto',right:'auto',bottom:'auto',
  left:Math.max(margin,Math.min(anchor.left,viewportWidth-margin-width)),
  top:Math.max(margin,Math.min(below+renderedHeight<=viewportHeight-margin?below:above,viewportHeight-margin-renderedHeight))
 };
}
