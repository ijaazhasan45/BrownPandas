import type { SVGProps } from "react";
type Name = "layers" | "brain" | "box" | "hand" | "upload" | "book" | "reset";
const paths: Record<Name, string> = {
 layers: "m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4",
 box: "m12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5",
 upload: "M12 16V3m-5 5 5-5 5 5M4 14v6h16v-6",
 book: "M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z",
 reset: "M4 4v6h6M4 10a8 8 0 1 1 0 5",
 hand: "M8 12V5a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 5-3 7-7 7-3 0-5-2-7-4l-4-5a2 2 0 0 1 3-3l3 3",
 brain: "M12 4c-3-4-7 0-5 3-4 0-5 5-2 7-3 3 0 7 3 6 0 3 4 3 4 0V4Zm0 0c3-4 7 0 5 3 4 0 5 5 2 7 3 3 0 7-3 6 0 3-4 3-4 0M7 7l2 2m-4 5 3-1m9-6-2 2m4 5-3-1"
};
export function BuildIcon({ name, ...props }: SVGProps<SVGSVGElement> & {name: Name}) {
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
