(function () {
  const BUTTON_ID = 'rc-floating-trigger';
  const MODAL_ID = 'rc-modal';

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

  function renderModal(results, summary, engagement) {
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
            <textarea id="rc-input-area" rows="6" placeholder='[ {"name":"User A","accountAgeDays":120,"friendsCount":200,"recentPosts":4,"avatarPresent":true} ]'></textarea>
            <div class="rc-input-actions">
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
    `;

    const resultsEl = modal.querySelector('#rc-results');
    resultsEl.innerHTML = '';
    results.forEach((profile) => resultsEl.appendChild(renderProfileRow(profile)));

    modal.querySelector('#rc-close').addEventListener('click', () => modal.remove());

    modal.querySelector('#rc-load-sample').addEventListener('click', () => {
      const input = modal.querySelector('#rc-input-area');
      input.value = JSON.stringify(sampleDataset, null, 2);
    });

    modal.querySelector('#rc-run').addEventListener('click', () => {
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
    });
  }

  function injectTrigger() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.textContent = 'RealCheck';
    btn.title = 'Phân tích like giả trên bài đăng';
    btn.addEventListener('click', () => {
      const evaluated = sampleDataset.map(evaluateLiker);
      const summary = summarizeResults(evaluated);
      renderModal(evaluated, summary, estimateEngagementFromPage());
    });
    document.body.appendChild(btn);
  }

  injectTrigger();
})();
