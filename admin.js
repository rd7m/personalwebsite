// داخل دالة renderAdminLink — استبدال الـ HTML الداخلي بـ:

li.innerHTML = `
  <div class="admin-link-item-top">
    <span class="admin-link-icon">${escapeHtml(icon)}</span>

    <div class="admin-link-info">
      <div class="admin-link-title">${escapeHtml(title)}</div>
      <div class="admin-link-url" title="${escapeHtml(url)}">${escapeHtml(url)}</div>
      <div class="admin-link-meta">
        <span>${visible ? "ظاهر" : "مخفي"}</span>
        <span>Neon ${escapeHtml(neonColor)}</span>
      </div>
    </div>
  </div>

  <div class="admin-link-actions">
    <button class="btn btn-toggle" type="button" data-action="toggle" data-id="${escapeHtml(link.id)}">
      ${visible ? "تعطيل" : "تفعيل"}
    </button>
    <button class="btn btn-edit" type="button" data-action="edit" data-id="${escapeHtml(link.id)}">
      تعديل
    </button>
    <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeHtml(link.id)}">
      حذف
    </button>
  </div>`;
