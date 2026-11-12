function PagePlaceholder({ description, title }) {
  return (
    <section className="page-placeholder" aria-labelledby="page-title">
      <p className="eyebrow">DINECLOUD · CUSTOMER</p>
      <h1 id="page-title">{title}</h1>
      <p className="page-description">{description}</p>
    </section>
  )
}

export default PagePlaceholder
