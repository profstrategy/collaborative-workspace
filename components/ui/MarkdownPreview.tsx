import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownPreviewProps {
	children: string;
	compact?: boolean;
	className?: string;
	links?: boolean;
}

export default function MarkdownPreview({
	children,
	compact = false,
	className,
	links = true,
}: MarkdownPreviewProps) {
	return (
		<div
			className={`prose prose-sm max-w-none wrap-break-word text-[#4B5563] prose-p:my-2 prose-headings:my-3 prose-headings:font-semibold prose-headings:text-[#1E232A] prose-a:text-blue-700 prose-a:underline prose-a:underline-offset-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:border-l-4 prose-blockquote:border-[#E2E5E9] prose-blockquote:pl-3 prose-blockquote:text-[#5E6672] prose-code:rounded prose-code:bg-[#F1F2F4] prose-code:px-1 prose-code:py-0.5 prose-pre:overflow-x-auto ${compact ? "prose-p:my-1 prose-headings:my-1 prose-p:text-xs prose-li:text-xs prose-headings:text-sm" : ""} ${className ?? ""}`}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={
					links
						? undefined
						: {
								a: ({ children: linkContent }) => (
									<span className="underline underline-offset-2">
										{linkContent}
									</span>
								),
							}
				}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
