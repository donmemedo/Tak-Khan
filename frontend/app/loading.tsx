export default function Loading() {
  return (
    <div aria-busy="true" className="animate-pulse space-y-6 motion-reduce:animate-none">
      <div className="h-12 w-2/3 max-w-xl rounded-2xl bg-fg/[.07]" />
      <div className="h-5 w-1/2 max-w-md rounded-xl bg-fg/[.05]" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="glass h-80 rounded-[28px]" />)}
      </div>
    </div>
  );
}
