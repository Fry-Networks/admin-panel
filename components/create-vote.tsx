import { Button, Flex, Textarea, Select, SelectItem, NumberInput } from '@tremor/react';
import { Key, useState } from 'react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';
import { Dialog, DialogPanel, Divider, TextInput } from '@tremor/react';

import { RiCloseLine } from '@remixicon/react';

const CATEGORIES = [
    { value: 'rewards', label: 'Rewards' },
    { value: 'platform', label: 'Platform' },
    { value: 'staking', label: 'Staking' },
    { value: 'community', label: 'Community' },
    { value: 'governance', label: 'Governance' }
];

export default function ModalCreateVote({isOpen, setIsOpen}: {isOpen: boolean, setIsOpen: Function}) {

    const [vote_title, setVoteTitle] = useState("");
    const [vote_description, setVoteDescription] = useState("");
    const [vote_end_date, setVoteEndDate] = useState(new Date());
    const [vote_options, setVoteOptions] = useState([{}] as {title: string, description: string}[]);
    const [vote_category, setVoteCategory] = useState("governance");
    const [discussion_days, setDiscussionDays] = useState(30);
    const [updateSuccess, setUpdateSuccess] = useState(""); // State to track update success
    
    const handleAddOption = (e: any) => {
        e.preventDefault();
        setVoteOptions([...vote_options, { title: "", description: "" }]);
    };

    const updateOption = (index: any, field: any, value: any) => {
        const updatedOptions = vote_options.map((option: any, idx: any) => {
            if (idx === index) {
                return { ...option, [field]: value };
            }
            return option;
        });
        setVoteOptions(updatedOptions);
    };
    
    const handleSubmit = async (e: any) => {
        const updateData = {
            title: vote_title,
            description: vote_description,
            options: vote_options,
            category: vote_category,
            discussion_days: discussion_days
        };
        const response = await fetch('/api/add-vote', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            setUpdateSuccess("error");
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
    };
    
    return (
        <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            static={true}
            className="z-[100]"
        >
            <DialogPanel className="sm:max-w-5xl bg-gray-900 border border-gray-700">
                <div className="absolute right-0 top-0 pr-3 pt-3">
                    <button
                        type="button"
                        className="rounded-tremor-small p-2 text-tremor-content-subtle hover:bg-tremor-background-subtle hover:text-tremor-content dark:text-dark-tremor-content-subtle hover:dark:bg-dark-tremor-background-subtle hover:dark:text-tremor-content"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close"
                    >
                        <RiCloseLine
                            className="h-5 w-5 shrink-0"
                            aria-hidden={true}
                        />
                    </button>
                </div>
                <form action="#" method="POST">
                    <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        Create a Vote
                    </h4>
                    <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
                        Note: creating a vote won&apos;t publish it. Use the &quot;Activate vote&quot; action when you&apos;re ready—multiple votes can stay active simultaneously.
                    </p>
                    <TextInput placeholder="Title" className='mt-2' onValueChange={(value) => setVoteTitle(value)} />
                    <Textarea placeholder="Description" className='mt-2' onValueChange={(value) => setVoteDescription(value)} />
                    
                    <Flex className="mt-4 gap-4" flexDirection="row">
                        <div className="flex-1">
                            <label className="text-sm text-gray-400 mb-1 block">Category</label>
                            <Select 
                                value={vote_category} 
                                onValueChange={setVoteCategory}
                                className="w-full"
                            >
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </Select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm text-gray-400 mb-1 block">Discussion Period (days)</label>
                            <NumberInput 
                                value={discussion_days}
                                onValueChange={(value) => setDiscussionDays(value || 30)}
                                min={1}
                                max={90}
                                placeholder="30"
                            />
                        </div>
                    </Flex>
                    
                    <Divider />
                    <Flex className="grid grid-cols-2 gap-4">
                        {vote_options.map((option: { title: string | undefined; description: string | number | undefined; }, index) => (
                            <div key={index} className='mr-5'>
                                <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                    Option {index + 1}
                                </h4>
                                <TextInput placeholder="Option Title" value={option.title} className='mt-2'
                                    onValueChange={(value) => updateOption(index, 'title', value)} />
                                <Textarea placeholder="Option Description" value={option.description} className='mt-2'
                                    onValueChange={(value) => updateOption(index, 'description', value)} />
                            </div>
                        ))}
                    </Flex>
                    <Flex flexDirection='col' className='mt-2' alignItems='start' justifyContent='start'>
                        <Button className="mt-2"
                            onClick={handleAddOption}
                        >
                            Add option</Button>
                        <div className="w-full flex justify-center">
                            <Button className="mt-2"
                                color='green'
                                size='xl'
                                onClick={(e) => {
                                    e.preventDefault(); 
                                    handleSubmit(e);
                                    window.location.reload();
                                    setIsOpen(false);
                                }}
                            >
                                Submit</Button>
                        </div>
                    </Flex>
                </form>
            </DialogPanel>
        </Dialog>
    );
}
