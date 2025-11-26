(function () {
  const BUTTON_ID = 'rc-floating-trigger';
  const MODAL_ID = 'rc-modal';
  const TOKEN_STORAGE_KEY = 'rc_graph_token';

  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const sampleDataset = [
    {
      name: 'Le Tran 19950302',
      accountAgeDays: 14,
      friendsCount: 35,
      recentPosts: 0,
      avatarPresent: false,
      duplicateAvatarHash: 'hash-a',
      profileUrl: 'https://facebook.com/example1'
    },
    {
      name: 'Ngoc Anh',
      accountAgeDays: 1850,
      friendsCount: 860,
      recentPosts: 15,
      avatarPresent: true,
      duplicateAvatarHash: 'hash-b',
      profileUrl: 'https://facebook.com/example2'
    },
    {
      name: 'Minh Duc 123456',
      accountAgeDays: 45,
      friendsCount: 120,
      recentPosts: 2,
      avatarPresent: true,
      duplicateAvatarHash: 'hash-a',
      profileUrl: 'https://facebook.com/example3'
    }
  ];

  function detectRandomizedName(name) {
    const pattern = /(\d{3,}|[_.-]{2,})/;
    return pattern.test(name || '');
  }

  function evaluateLiker(liker) {
    const signals = [];
    let risk = 0;

    if (!liker.avatarPresent) {
      risk += 2;
      signals.push('Không có ảnh đại diện');
    }

    if (liker.accountAgeDays !== undefined) {
      if (liker.accountAgeDays < 90) {
        risk += 2;
        signals.push('Tài khoản mới (< 3 tháng)');
      } else if (liker.accountAgeDays < 365) {
        risk += 1;
        signals.push('Tài khoản trẻ (< 1 năm)');
      }
    }

    if (liker.friendsCount !== undefined) {
      if (liker.friendsCount < 50) {
        risk += 2;
        signals.push('Ít bạn bè (< 50)');
      } else if (liker.friendsCount < 150) {
        risk += 1;
        signals.push('Bạn bè thấp');
      }
    }

    if (liker.recentPosts !== undefined) {
      if (liker.recentPosts === 0) {
        risk += 2;
        signals.push('Không có bài đăng gần đây');
      } else if (liker.recentPosts < 3) {
        risk += 1;
        signals.push('Hoạt động thấp');
      }
    }

    if (detectRandomizedName(liker.name)) {
      risk += 1;
      signals.push('Tên chứa chuỗi số/ký tự lặp');
    }

    if (liker.duplicateAvatarHash) {
      risk += 1;
      signals.push('Ảnh đại diện trùng lặp');
    }

    let verdict = 'Thật';
    if (risk >= 5) {
      verdict = 'Rất đáng ngờ';
    } else if (risk >= 3) {
      verdict = 'Khả nghi';
    }

    return {
      ...liker,
      risk,
      verdict,
      signals
    };
  }

  function summarizeResults(profiles) {
    const summary = {
      total: profiles.length,
      suspicious: 0,
      highRisk: 0,
      lowRisk: 0
    };

    profiles.forEach((p) => {
      if (p.risk >= 3) {
        summary.suspicious += 1;
      }
      if (p.risk >= 5) {
        summary.highRisk += 1;
      } else if (p.risk === 0) {
        summary.lowRisk += 1;
      }
    });

    return summary;
  }

  function extractPostId(input) {
    if (!input) return null;
    const trimmed = input.trim();

    const fbidMatch = trimmed.match(/(?:fbid=|story_fbid=)(\d+)/);
    if (fbidMatch) return fbidMatch[1];

    const postPathMatch = trimmed.match(/\/posts\/([0-9]+)/);
    if (postPathMatch) return postPathMatch[1];

    const videoMatch = trimmed.match(/\/videos\/([0-9]+)/);
    if (videoMatch) return videoMatch[1];

    const reelMatch = trimmed.match(/\/reel\/([0-9]+)/);
    if (reelMatch) return reelMatch[1];

    const permalinkMatch = trimmed.match(/\/permalink\/([0-9]+)/);
    if (permalinkMatch) return permalinkMatch[1];

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        const idFromPath = url.pathname.match(/(\d{8,})/);
        if (idFromPath) return idFromPath[1];
      } catch (err) {
        // ignore parse errors
      }
    }

    return /^\d{8,}$/.test(trimmed) ? trimmed : null;
  }

  async function fetchReactionsFromGraph(postInput, token) {
    const postId = extractPostId(postInput);
    if (!postId) {
      throw new Error('Không xác định được post ID từ URL/ID bạn nhập.');
    }
    if (!token) {
      throw new Error('Vui lòng nhập access token của ứng dụng hoặc user.');
    }

    let url = `https://graph.facebook.com/v18.0/${postId}/reactions?fields=id,name,link,pic&limit=5000&access_token=${encodeURIComponent(token)}`;
    const all = [];
    let safetyCount = 0;

    while (url && safetyCount < 20) {
      safetyCount += 1;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!resp.ok) {
        const message = data.error?.message || resp.statusText;
        throw new Error(message);
      }

      const chunk = (data.data || []).map((item) => ({
        name: item.name,
        profileUrl: item.link,
        avatarPresent: !!item.pic
      }));
      all.push(...chunk);
      url = data.paging?.next || null;
    }

    if (safetyCount >= 20 && url) {
      throw new Error('Dữ liệu quá lớn, dừng sau 20 trang phân trang để tránh treo trình duyệt.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return all;
  }

  function renderProfileRow(profile) {
    const row = document.createElement('div');
    row.className = 'rc-result-row';
    row.innerHTML = `
      <div class="rc-row-main">
        <div class="rc-name">${profile.name || 'Ẩn danh'}</div>
        <div class="rc-verdict ${profile.verdict === 'Rất đáng ngờ' ? 'rc-badge-danger' : profile.verdict === 'Khả nghi' ? 'rc-badge-warning' : 'rc-badge-safe'}">${profile.verdict}</div>
      </div>
      <div class="rc-row-meta">
        <span>Tài khoản: ${profile.accountAgeDays || '?'} ngày</span>
        <span>Bạn bè: ${profile.friendsCount || '?'} </span>
        <span>Bài đăng gần đây: ${profile.recentPosts || 0}</span>
        ${profile.profileUrl ? `<a href="${profile.profileUrl}" target="_blank">Trang cá nhân</a>` : ''}
      </div>
      <div class="rc-signals">${profile.signals.join(' • ') || 'Không phát hiện vấn đề'}</div>
    `;
    return row;
  }

  function estimateEngagementFromPage() {
    const counts = {
      reactions: null,
      comments: null,
      shares: null
    };

    const likeNodes = Array.from(document.querySelectorAll('[aria-label]'))
      .filter((el) => /like|thích|reactions/i.test(el.getAttribute('aria-label')) && el.innerText);

    if (likeNodes.length > 0) {
      counts.reactions = likeNodes[0].innerText;
    }

    const commentNode = document.querySelector('[aria-label*="comment" i], [aria-label*="bình luận" i]');
    if (commentNode && commentNode.innerText) {
      counts.comments = commentNode.innerText;
    }

    const shareNode = document.querySelector('[aria-label*="share" i], [aria-label*="chia sẻ" i]');
    if (shareNode && shareNode.innerText) {
      counts.shares = shareNode.innerText;
    }

    return counts;
  }

  function collectVisibleLikers() {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return [];

    const links = Array.from(dialog.querySelectorAll('a[role="link"]'));
    const profiles = [];
    links.forEach((link) => {
      const nameEl = link.querySelector('strong, span');
      const name = (nameEl && nameEl.textContent || '').trim();
      if (!name) return;

      const avatarPresent = !!link.querySelector('img, image, svg[aria-label]');
      const profileUrl = link.href;
      profiles.push({
        name,
        profileUrl,
        avatarPresent
      });
    });

    const uniqueByUrl = new Map();
    profiles.forEach((p) => {
      if (!uniqueByUrl.has(p.profileUrl)) {
        uniqueByUrl.set(p.profileUrl, p);
      }
    });

    return Array.from(uniqueByUrl.values());
  }

  function resetModalIfAny() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.remove();
    }
  }

  function renderModal(results, summary, engagement, options = {}) {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = MODAL_ID;
      modal.className = 'rc-modal';
      modal.innerHTML = `
        <div class="rc-modal-content">
          <div class="rc-modal-header">
            <div>
              <h2>FB RealCheck</h2>
              <p>Đánh giá lượt like để phát hiện dấu hiệu buff ảo</p>
            </div>
            <button id="rc-close">✕</button>
          </div>
          <div class="rc-stats" id="rc-stats"></div>
          <div class="rc-engagement" id="rc-engagement"></div>
          <div class="rc-results" id="rc-results"></div>
          <div class="rc-input">
            <h3>Nhập danh sách like (JSON)</h3>
            <p>Mỗi phần tử gồm các trường: <code>name</code>, <code>accountAgeDays</code>, <code>friendsCount</code>, <code>recentPosts</code>, <code>avatarPresent</code>, <code>profileUrl</code>.</p>
            <p class="rc-engagement-note">Nếu không lấy được file JSON, hãy mở danh sách like/reaction trên bài đăng, bấm "Lấy dữ liệu từ trang" để điền, sau đó dùng "Sao chép JSON" hoặc "Tải JSON".</p>
            <div class="rc-api-box">
              <div class="rc-api-header">Có access token Facebook? Hãy dùng Graph API để tải danh sách reaction.</div>
              <label class="rc-api-field">
                <span>Post ID hoặc URL bài viết</span>
                <input id="rc-post-id" placeholder="Ví dụ: 1234567890123456 hoặc https://www.facebook.com/permalink/..." />
              </label>
              <label class="rc-api-field">
                <span>Access token (App/User)</span>
                <input id="rc-access-token" placeholder="EAAB..." />
              </label>
              <div class="rc-input-actions rc-api-actions">
                <button id="rc-fetch-graph">Gọi Graph API</button>
                <span class="rc-api-note">Token được lưu cục bộ, không gửi ra ngoài.</span>
              </div>
            </div>
            <textarea id="rc-input-area" rows="6" placeholder='[ {"name":"User A","accountAgeDays":120,"friendsCount":200,"recentPosts":4,"avatarPresent":true} ]'></textarea>
            <div class="rc-input-actions">
              <button id="rc-load-scraped">Lấy dữ liệu từ trang</button>
              <button id="rc-copy-json">Sao chép JSON</button>
              <button id="rc-download-json">Tải JSON</button>
              <button id="rc-load-sample">Tải dữ liệu mẫu</button>
              <button id="rc-run">Phân tích</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const statsEl = modal.querySelector('#rc-stats');
    statsEl.innerHTML = `
      <div class="rc-stat-card">
        <div class="rc-stat-label">Tổng lượt like</div>
        <div class="rc-stat-value">${summary.total}</div>
      </div>
      <div class="rc-stat-card">
        <div class="rc-stat-label">Khả nghi</div>
        <div class="rc-stat-value rc-danger">${summary.suspicious}</div>
      </div>
      <div class="rc-stat-card">
        <div class="rc-stat-label">Rủi ro cao</div>
        <div class="rc-stat-value rc-danger">${summary.highRisk}</div>
      </div>
      <div class="rc-stat-card">
        <div class="rc-stat-label">Có dấu hiệu tốt</div>
        <div class="rc-stat-value rc-safe">${summary.lowRisk}</div>
      </div>
    `;

    const engagementEl = modal.querySelector('#rc-engagement');
    engagementEl.innerHTML = `
      <div class="rc-engagement-header">Chỉ số tương tác trên trang</div>
      <div class="rc-engagement-grid">
        <div><strong>Reactions:</strong> ${engagement.reactions || 'Không tìm thấy'}</div>
        <div><strong>Comments:</strong> ${engagement.comments || 'Không tìm thấy'}</div>
        <div><strong>Shares:</strong> ${engagement.shares || 'Không tìm thấy'}</div>
      </div>
      <p class="rc-engagement-note">So sánh tỉ lệ like/bình luận/chia sẻ để phát hiện chênh lệch bất thường.</p>
      ${options.dataSource === 'sample' ? '<p class="rc-engagement-note">Không tìm thấy danh sách like trên trang, đang dùng dữ liệu mẫu để minh hoạ.</p>' : ''}
    `;

    const resultsEl = modal.querySelector('#rc-results');
    resultsEl.innerHTML = '';
    results.forEach((profile) => resultsEl.appendChild(renderProfileRow(profile)));

    const postInput = modal.querySelector('#rc-post-id');
    const tokenInput = modal.querySelector('#rc-access-token');
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken && tokenInput && !tokenInput.value) {
      tokenInput.value = savedToken;
    }

    if (postInput && !postInput.value) {
      postInput.value = location.href;
    }

    modal.querySelector('#rc-close').onclick = () => {
      modal.remove();
      if (window.updateTriggerState) {
        window.updateTriggerState(false);
      }
    };

    modal.querySelector('#rc-load-scraped').onclick = () => {
      const scraped = collectVisibleLikers();
      if (!scraped.length) {
        alert('Không tìm thấy danh sách like đang mở. Hãy bấm vào bộ đếm reaction để mở hộp thoại rồi thử lại.');
        return;
      }

      const input = modal.querySelector('#rc-input-area');
      input.value = JSON.stringify(scraped, null, 2);
    };

    modal.querySelector('#rc-copy-json').onclick = async () => {
      const data = modal.querySelector('#rc-input-area').value.trim();
      if (!data) {
        alert('Không có dữ liệu để sao chép. Hãy lấy dữ liệu từ trang hoặc nhập JSON.');
        return;
      }
      try {
        await navigator.clipboard.writeText(data);
        alert('Đã sao chép JSON vào clipboard.');
      } catch (err) {
        alert('Trình duyệt chặn sao chép tự động, bạn có thể chọn và sao chép thủ công.');
      }
    };

    modal.querySelector('#rc-download-json').onclick = () => {
      const data = modal.querySelector('#rc-input-area').value.trim();
      if (!data) {
        alert('Không có dữ liệu để tải xuống. Hãy lấy dữ liệu từ trang hoặc nhập JSON.');
        return;
      }

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'realcheck-likers.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    modal.querySelector('#rc-load-sample').onclick = () => {
      const input = modal.querySelector('#rc-input-area');
      input.value = JSON.stringify(sampleDataset, null, 2);
    };

    modal.querySelector('#rc-run').onclick = () => {
      const input = modal.querySelector('#rc-input-area').value.trim();
      if (!input) {
        alert('Vui lòng nhập danh sách like ở dạng JSON.');
        return;
      }
      try {
        const parsed = JSON.parse(input);
        const evaluated = (parsed || []).map(evaluateLiker);
        const newSummary = summarizeResults(evaluated);
        renderModal(evaluated, newSummary, estimateEngagementFromPage());
      } catch (err) {
        alert('Dữ liệu không hợp lệ: ' + err.message);
      }
    };

    modal.querySelector('#rc-fetch-graph').onclick = async () => {
      const postValue = postInput?.value || '';
      const tokenValue = tokenInput?.value || '';
      const button = modal.querySelector('#rc-fetch-graph');
      button.disabled = true;
      button.textContent = 'Đang tải...';
      try {
        const fetched = await fetchReactionsFromGraph(postValue, tokenValue);
        if (!fetched.length) {
          alert('Không nhận được dữ liệu reaction nào từ Graph API.');
        }
        const input = modal.querySelector('#rc-input-area');
        input.value = JSON.stringify(fetched, null, 2);
      } catch (err) {
        alert('Lỗi khi gọi Graph API: ' + err.message);
      } finally {
        button.disabled = false;
        button.textContent = 'Gọi Graph API';
      }
    };
  }

  function injectTrigger() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.textContent = 'RealCheck';
    btn.title = 'Phân tích like giả trên bài đăng';

    function toggleModal() {
      const modal = document.getElementById(MODAL_ID);
      if (modal) {
        modal.remove();
        updateTriggerState(false);
        return;
      }

      const scraped = collectVisibleLikers();
      const dataset = scraped.length ? scraped : sampleDataset;
      const evaluated = dataset.map(evaluateLiker);
      const summary = summarizeResults(evaluated);
      renderModal(evaluated, summary, estimateEngagementFromPage(), {
        dataSource: scraped.length ? 'live' : 'sample'
      });
      updateTriggerState(true);
    }

    btn.addEventListener('click', toggleModal);
    document.body.appendChild(btn);

    function updateTriggerState(isOpen) {
      btn.dataset.rcOpen = isOpen ? 'true' : 'false';
      btn.textContent = isOpen ? 'Đóng RealCheck' : 'RealCheck';
      btn.title = isOpen ? 'Bấm để thu cửa sổ RealCheck' : 'Phân tích like giả trên bài đăng';
    }

    window.updateTriggerState = updateTriggerState;
  }

  function watchUrlChanges() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        resetModalIfAny();
        if (window.updateTriggerState) {
          window.updateTriggerState(false);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  injectTrigger();
  watchUrlChanges();
})();
