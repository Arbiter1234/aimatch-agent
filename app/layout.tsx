import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://aimatch-lab-lijingze-2027.qq-2547962259.chatgpt.site",
  ),
  title: "AIMatch Agent | AI 产品经理作品集",
  description:
    "一个基于 LangGraph、具备证据审计、确定性工具和条件路由的 AI 求职决策 Agent 产品作品。",
  openGraph: {
    title: "AIMatch Agent | AI 产品经理作品集",
    description:
      "基于 LangGraph，让岗位匹配结论有证据，也有审计：产品问题、Agent 工作流、脱敏样例与评测设计。",
    url: "https://aimatch-lab-lijingze-2027.qq-2547962259.chatgpt.site",
    siteName: "AIMatch Agent",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "https://aimatch-lab-lijingze-2027.qq-2547962259.chatgpt.site/og.png",
        width: 1731,
        height: 909,
        alt: "AIMatch Agent 的六节点证据审计工作流",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIMatch Agent | AI 产品经理作品集",
    description:
      "基于 LangGraph，具备证据审计、确定性工具和条件路由的 AI 求职决策 Agent。",
    images: [
      "https://aimatch-lab-lijingze-2027.qq-2547962259.chatgpt.site/og.png",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
