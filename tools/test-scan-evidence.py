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

    def test_aws_account_rule_does_not_flag_plain_12_digit_numbers(self):
        """맨몸 12자리 숫자는 AWS 계정이 아니다. 오탐이 발행을 막으면 게이트를 신뢰하지 않게 된다."""
        for text in (
            "일련번호 123456789012 입니다",
            "전화 01012345678 입니다",
            "측정 타임스탬프 175800000000 기준",
        ):
            with self.subTest(text=text):
                self.assertNotIn("AWS_ACCOUNT", [hit[0] for hit in scan.scan_text(text)])

    def test_aws_account_rule_still_blocks_real_identifiers(self):
        """오탐을 줄이되 실제 계정 식별자는 계속 막는다."""
        for text in (
            "arn:aws:iam::123456789012:role/app",
            "arn:aws:s3:ap-northeast-2:123456789012:bucket",
            "aws_account_id: 123456789012",
            "Account ID = 123456789012",
        ):
            with self.subTest(text=text):
                self.assertIn("AWS_ACCOUNT", [hit[0] for hit in scan.scan_text(text)])

    def test_local_path_rule_catches_windows_and_all_wsl_drives(self):
        """이전 패턴은 백슬래시 2개를 요구해 실제 Windows 경로를 놓쳤고 /mnt 도 c·d만 봤다."""
        for text in (
            r"C:\Users\geonu\notes.txt",
            r"d:\Users\someone\x",
            "C:/Users/geonu/x",
            "/mnt/e/data",
            "/mnt/c/work",
            "/home/geonu/x",
            "~/workspace/repos/",
        ):
            with self.subTest(text=text):
                self.assertIn("LOCAL_PATH", [hit[0] for hit in scan.scan_text(text)])


if __name__ == "__main__":
    unittest.main()
