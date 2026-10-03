import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

export function initBilling() {
  const tossButton = document.querySelector("#toss-billing-button");
  const kakaoButton = document.querySelector("#kakao-billing-button");
  const naverButton = document.querySelector("#naver-billing-button");

  // 0. 리다이렉트 승인 콜백 처리 (카카오페이 / 네이버페이 승인)
  handleRedirectCallbacks();

  // 1. 토스페이먼츠 카드 등록 버튼
  if (tossButton) {
    tossButton.addEventListener("click", async () => {
      try {
        tossButton.disabled = true;

        const response = await fetch("/api/billing/toss/prepare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`결제 준비 실패: ${error}`);
        }

        const { customerKey, clientKey } = await response.json();
        if (!customerKey || !clientKey) {
          throw new Error(
            "결제 키 정보(customerKey/clientKey)가 누락되었습니다.",
          );
        }

        const tossPayments = await loadTossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey });

        await payment.requestBillingAuth({
          method: "CARD",
          successUrl: `${window.location.origin}/billing/success`,
          failUrl: `${window.location.origin}/billing/fail`,
        });
      } catch (error) {
        console.error("토스 결제창 실행 실패:", error);
        alert(
          error instanceof Error ? error.message : "결제창을 열 수 없습니다.",
        );
      } finally {
        tossButton.disabled = false;
      }
    });
  }

  // 2. 카카오페이 연결 버튼
  if (kakaoButton) {
    kakaoButton.addEventListener("click", async () => {
      try {
        kakaoButton.disabled = true;

        const response = await fetch("/api/billing/kakao/prepare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`카카오페이 준비 실패: ${error}`);
        }

        const data = await response.json();
        const redirectUrl = isMobile()
          ? data.nextRedirectMobileUrl
          : data.nextRedirectPcUrl;

        if (!redirectUrl) {
          throw new Error("카카오페이 결제 페이지 URL을 전달받지 못했습니다.");
        }

        window.location.href = redirectUrl;
      } catch (error) {
        console.error("카카오페이 실행 실패:", error);
        alert(
          error instanceof Error
            ? error.message
            : "카카오페이를 실행할 수 없습니다.",
        );
        kakaoButton.disabled = false;
      }
    });
  }

  // 3. 네이버페이 자동결제 연결 버튼 (NaverPay Recurrent SDK 방식)
  if (naverButton) {
    naverButton.addEventListener("click", async () => {
      try {
        naverButton.disabled = true;

        // 백엔드에서 네이버페이 SDK 초기화 정보 조회
        const res = await fetch("/api/billing/naver/config");
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`네이버페이 설정을 불러올 수 없습니다: ${errText}`);
        }
        const config = await res.json();

        if (!window.Naver || !window.Naver.Pay) {
          throw new Error(
            "네이버페이 공식 SDK 스크립트(naverpay.min.js)가 로드되지 않았습니다.",
          );
        }

        // 1. SDK 인스턴스 생성 (payType: 'recurrent' 지정)
        const oPay = window.Naver.Pay.create({
          payType: "recurrent",
          mode: config.mode || "development",
          clientId: config.clientId,
          chainId:
            config.chainId && config.chainId.trim() !== ""
              ? config.chainId
              : config.clientId,
        });

        // 2. 자동결제 등록 창 열기 (스펙 파라미터 전부 바인딩)
        oPay.open({
          productCode: config.productCode || "premium_monthly",
          productName: config.productName || "Q-fit Premium (monthly)",
          totalPayAmount: config.totalPayAmount || 2400,
          returnUrl: `${window.location.origin}/billing/naver/approve`,
          merchantUserId: config.merchantUserId || "user_guest",
        });
      } catch (error) {
        console.error("네이버페이 SDK 결제창 실행 실패:", error);
        alert(
          error instanceof Error
            ? error.message
            : "네이버페이 결제창을 열 수 없습니다.",
        );
      } finally {
        naverButton.disabled = false;
      }
    });
  }
}

// 결제 리다이렉트 콜백 승인 처리 함수 (카카오/네이버)
async function handleRedirectCallbacks() {
  const urlParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  // 카카오페이 승인 콜백 처리
  if (path.includes("/billing/kakao/approve") || urlParams.has("pg_token")) {
    const pgToken = urlParams.get("pg_token");
    const tid = urlParams.get("tid") || sessionStorage.getItem("kakao_tid");
    const partnerOrderId =
      urlParams.get("partner_order_id") ||
      sessionStorage.getItem("kakao_partner_order_id");

    if (pgToken && tid && partnerOrderId) {
      try {
        const res = await fetch("/api/billing/kakao/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pgToken, tid, partnerOrderId }),
        });
        if (res.ok) {
          alert("카카오페이 결제가 성공적으로 승인되었습니다!");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } else {
          const err = await res.json().catch(() => ({}));
          alert(
            `카카오페이 승인 실패: ${err.message || err.error || "결제 승인 중 오류가 발생했습니다."}`,
          );
        }
      } catch (e) {
        console.error("KakaoPay approve error:", e);
      }
    }
  }

  // 네이버페이 승인 콜백 처리
  if (path.includes("/billing/naver/approve") || urlParams.has("paymentId")) {
    const paymentId = urlParams.get("paymentId");
    const resultCode = urlParams.get("resultCode") || "Success";
    const recurrentPayNo =
      urlParams.get("recurrentPayNo") || urlParams.get("tempToken");

    if (paymentId || recurrentPayNo) {
      try {
        const res = await fetch("/api/billing/naver/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, resultCode, recurrentPayNo }),
        });
        const err = await res.json().catch(() => ({}));
        if (res.ok) {
          alert("네이버페이 결제가 성공적으로 승인되었습니다!");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } else {
          alert(
            `네이버페이 승인 실패 [${err.code || res.status}]: ${err.message || err.error || "결제 승인 중 오류가 발생했습니다."}`,
          );
        }
      } catch (e) {
        console.error("NaverPay approve error:", e);
      }
    }
  }
}

// 모바일 기기 판별 Helper
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}
