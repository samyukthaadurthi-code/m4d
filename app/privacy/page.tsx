import { brand } from "@/lib/brand";

export const metadata = { title: "Privacy Policy — MRC Landmarks" };

const GRIEVANCE_EMAIL =
  process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? "privacy@mrclandmarks.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F5EF] pb-20">
      <header className="bg-[#1A2A2D] px-5 py-7 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="text-lg font-bold tracking-[0.18em]">{brand.name}</div>
          <div className="mt-1 text-xs tracking-widest text-[#C4A97D]">
            {brand.tagline}
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-5 text-[#2C3A38]">
        <h1 className="mt-8 text-3xl font-bold text-[#1A2A2D]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#8A8D82]">
          Applies to the MRC Landmarks channel partner and site visit forms.
        </p>

        <Section title="What we collect">
          <p>
            When you register as a channel partner we collect your name, mobile
            number, WhatsApp number, email address, postal address, the areas you
            work in, your years of experience, the property types you sell and the
            kind of buyers you usually serve. If you apply to the channel partner
            programme we also collect your PAN, and your GST and TNRERA
            registration numbers where you have them.
          </p>
          <p>
            When you request a site visit we collect your name, mobile number,
            location, what you are looking for, your budget and your preferred
            visit date. If a partner referred you, we record their partner ID.
          </p>
        </Section>

        <Section title="Why we collect it">
          <p>
            To register you for the event and issue your partner ID, to arrange
            site visits, to answer your enquiries, to credit the partner who
            referred you, and to contact you about MRC Landmarks projects, the
            channel partner programme and MRC events.
          </p>
        </Section>

        <Section title="How we contact you">
          <p>
            By WhatsApp, phone, SMS and email. You agreed to this when you
            submitted the form, and you can withdraw that agreement at any time.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            MRC Landmarks staff who need it to do their work, and the service
            providers who host this service and deliver our messages. We do not
            sell your details, and we do not share them for anyone else&rsquo;s
            marketing.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            For as long as you are an active partner or enquiry, and for a
            reasonable period afterwards for our records. Ask us to delete it and
            we will, unless the law requires us to keep it.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask what we hold about you, ask us to correct it, ask us to
            delete it, and withdraw your consent to being contacted. Write to{" "}
            <a
              href={`mailto:${GRIEVANCE_EMAIL}`}
              className="font-medium text-[#176A70] underline underline-offset-2"
            >
              {GRIEVANCE_EMAIL}
            </a>{" "}
            and we will respond.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy, or about how your details are handled,
            go to{" "}
            <a
              href={`mailto:${GRIEVANCE_EMAIL}`}
              className="font-medium text-[#176A70] underline underline-offset-2"
            >
              {GRIEVANCE_EMAIL}
            </a>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#1A2A2D]">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
