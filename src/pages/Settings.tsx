import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User as UserIcon, ShieldCheck } from "lucide-react";
import {
  useOrganization, useProfile, useCreateOrganization,
  useUpdateOrganization, useUpdateProfile,
} from "@/hooks/useOrganization";
import { toast } from "sonner";

const emptyOrg = {
  name: "", legal_name: "", registration_number: "", tax_id: "", industry: "",
  website: "", contact_email: "", contact_phone: "",
  postal_address: "", physical_address: "", city: "", region: "", country: "",
};

const Settings = () => {
  const { data: profile } = useProfile();
  const { data: org } = useOrganization();
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const updateProfile = useUpdateProfile();

  const [orgForm, setOrgForm] = useState<any>(emptyOrg);
  const [profForm, setProfForm] = useState({ full_name: "", job_title: "", phone: "" });

  useEffect(() => {
    if (org) setOrgForm({ ...emptyOrg, ...org });
  }, [org]);

  useEffect(() => {
    if (profile) setProfForm({
      full_name: profile.full_name ?? "",
      job_title: profile.job_title ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile]);

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name?.trim()) return toast.error("Business name is required");
    try {
      if (org) {
        await updateOrg.mutateAsync({ id: org.id, ...orgForm });
        toast.success("Organization updated");
      } else {
        await createOrg.mutateAsync(orgForm);
        toast.success("Organization created — you are the owner");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(profForm);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const set = (k: string) => (e: any) => setOrgForm({ ...orgForm, [k]: e.target.value });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your business profile and personal account
        </p>
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org"><Building2 className="h-4 w-4 mr-2" />Business profile</TabsTrigger>
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-2" />Your profile</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <Card className="p-6">
            {!org && (
              <div className="mb-4 p-3 bg-shield/10 border border-shield/30 rounded-md text-sm flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-shield mt-0.5" />
                <span>You haven't set up a business yet. Fill in the details below — you'll become the owner.</span>
              </div>
            )}
            <form onSubmit={saveOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Business name *</Label>
                <Input value={orgForm.name} onChange={set("name")} required />
              </div>
              <div>
                <Label>Legal name</Label>
                <Input value={orgForm.legal_name ?? ""} onChange={set("legal_name")} />
              </div>
              <div>
                <Label>Industry</Label>
                <Input value={orgForm.industry ?? ""} onChange={set("industry")} placeholder="Banking, Insurance, …" />
              </div>
              <div>
                <Label>Registration number</Label>
                <Input value={orgForm.registration_number ?? ""} onChange={set("registration_number")} />
              </div>
              <div>
                <Label>Tax / VAT ID</Label>
                <Input value={orgForm.tax_id ?? ""} onChange={set("tax_id")} />
              </div>
              <div>
                <Label>Contact email</Label>
                <Input type="email" value={orgForm.contact_email ?? ""} onChange={set("contact_email")} />
              </div>
              <div>
                <Label>Contact phone</Label>
                <Input value={orgForm.contact_phone ?? ""} onChange={set("contact_phone")} />
              </div>
              <div className="md:col-span-2">
                <Label>Website</Label>
                <Input value={orgForm.website ?? ""} onChange={set("website")} placeholder="https://" />
              </div>
              <div className="md:col-span-2">
                <Label>Postal address</Label>
                <Textarea value={orgForm.postal_address ?? ""} onChange={set("postal_address")} rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Physical address</Label>
                <Textarea value={orgForm.physical_address ?? ""} onChange={set("physical_address")} rows={2} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={orgForm.city ?? ""} onChange={set("city")} />
              </div>
              <div>
                <Label>Region / State</Label>
                <Input value={orgForm.region ?? ""} onChange={set("region")} />
              </div>
              <div className="md:col-span-2">
                <Label>Country</Label>
                <Input value={orgForm.country ?? ""} onChange={set("country")} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createOrg.isPending || updateOrg.isPending}>
                  {org ? "Save changes" : "Create business"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="p-6">
            <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full name</Label>
                <Input value={profForm.full_name} onChange={(e) => setProfForm({ ...profForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Job title</Label>
                <Input value={profForm.job_title} onChange={(e) => setProfForm({ ...profForm, job_title: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profForm.phone} onChange={(e) => setProfForm({ ...profForm, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={updateProfile.isPending}>Save profile</Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
