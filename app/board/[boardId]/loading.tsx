export default function BoardLoading() {
  return (
    <main
      aria-busy="true"
      className="flex flex-1 items-center justify-center px-4 py-10"
    >
      <p role="status" className="text-sm text-[#4B5563]">
        Loading board...
      </p>
    </main>
  );
}
