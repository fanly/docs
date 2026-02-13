"use client";

import dynamic from "next/dynamic";

const SDKEditor = dynamic(() => import("@/components/editor/sdk/WordSDKEditor"), {
  ssr: false,
  loading: () => <div className="page-card">SDK editor loading...</div>
});

export function SDKEditorEntry() {
  return <SDKEditor />;
}
