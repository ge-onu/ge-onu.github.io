"""Keep excluded public cases, private links and credentials blocked."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("scan", Path(__file__).with_name("scan-evidence.py"))
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)


class PublicationGate(unittest.TestCase):
    def test_ranking_case_and_cross_links_blocked(self):
        for text in [
            "합성 라벨 평가 후 ML 랭킹을 배포하지 않고 rule-based를 유지했습니다.",
            "ML 랭킹을 배포·활성화하지 않고 rule-based ranking을 유지했습니다.",
            '<a href="#ranking-decision">판단 보기</a>',
            "랭킹 채택 판단", "왜 랭킹을 켜지 않았나", "랭킹 비배포",
        ]:
            with self.subTest(text=text):
                self.assertIn("RANKING_ACTIVATION_STATE", [h[0] for h in scan.scan_text(text)])

    def test_private_evidence_link_blocked(self):
        text = "https://github.com/ge-onu/infra-aiops-career-hub/blob/example/evidence.md"
        self.assertIn("PRIVATE_EVIDENCE_LINK", [h[0] for h in scan.scan_text(text)])

    def test_unsupported_claims_stay_blocked(self):
        for text, rule in [
            ("랭킹을 실서비스에서 운영했습니다.", "RANKING_PRODUCTION_CLAIM"),
            ("개인화 성능을 입증했습니다.", "OVERCLAIM_PERSONALIZATION"),
            ("NDCG 0.99", "NDCG_UNLABELLED"),
            ("1,750개 평가 케이스", "OVERCLAIM_CASES"),
        ]:
            with self.subTest(rule=rule):
                self.assertIn(rule, [hit[0] for hit in scan.scan_text(text)])

    def test_secret_rules_stay_blocked(self):
        for text, rule in [
            ("api_key=not-a-real-credential", "CREDENTIAL"),
            ("-----BEGIN OPENSSH PRIVATE KEY-----", "PRIVATE_KEY"),
            ("AKIA" + "A" * 16, "AWS_KEY"),
        ]:
            with self.subTest(rule=rule):
                self.assertIn(rule, [hit[0] for hit in scan.scan_text(text)])


if __name__ == "__main__":
    unittest.main()
