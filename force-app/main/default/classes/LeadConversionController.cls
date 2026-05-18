public class LeadConversionController {

    @InvocableMethod(label='Convert Lead' description='Converts a Lead into an Opportunity')
    public static void convertLead(List<Id> leadIds) {
        for (Id leadId : leadIds) {
            try {
                // Prepare Lead Convert object
                Database.LeadConvert leadConvert = new Database.LeadConvert();
                leadConvert.setLeadId(leadId);
                leadConvert.setDoNotCreateOpportunity(false); // Creates an Opportunity
                leadConvert.setConvertedStatus([SELECT MasterLabel FROM LeadStatus WHERE IsConverted=true LIMIT 1].MasterLabel);

                // Perform conversion
                Database.LeadConvertResult result = Database.convertLead(leadConvert);
                
                if (!result.isSuccess()) {
                    //throw new Exception('Lead Conversion failed: ' + result.getErrors());
                }
            } catch (Exception ex) {
                System.debug('Error during Lead conversion: ' + ex.getMessage());
            }
        }
    }
}